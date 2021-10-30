const config        = require('./config.json');
const https         = require('https');
const { spawn }     = require('child_process');
const url           = require('url');
const express       = require('express');
const { request } = require('http');
const app = express();

let vlcProcess = null;
let selectedQuality = config.qualities[config.default_quality];
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));

const spawnVLC = (video_id, quality)=>{
	if (vlcProcess)	{
		vlcProcess.kill('SIGKILL');
	}

	const args = [
		"-vvv --preferred-resolution=" + config.preferred_resolution + " --network-caching=" + config.cache_milliseconds + " --sout-livehttp-caching",
		"https://www.youtube.com/watch?v=" + video_id,
		"--sout",
		"'#transcode{" + selectedQuality.transcode + "}:standard{access=http{mime=" + selectedQuality.mime + "},dst=0.0.0.0:" + config.ports.vlc + selectedQuality.extra + "}'"
	];

	console.log(args);

	vlcProcess = spawn('vlc', args, {shell: true, detached: true});

	vlcProcess.stdout.on('data', (data) => {
		console.log(`stdout: ${data}`);
	});

	vlcProcess.stderr.on('data', (data) => {
		console.error(`stderr: ${data}`);
	});

	vlcProcess.on('close', (code) => {
		console.log(`NODE: child process exited with code ${code}`);
		vlcProcess = null;
	});
}

const showResults = (res, searchQuery, results)=>{
	res.render('index.ejs', {searchQuery: searchQuery, results: results, selectedQuality: selectedQuality, qualities: config.qualities});
}

const playVideo = (res, videoInfo, bypass)=>{
	if (bypass == 1) {
		iframeUrl = "https://youtube.com/embed/" + videoInfo.items[0].id
	} else {
		iframeUrl = "http://" + config.server_url + ":" + config.ports.vlc
		spawnVLC(videoInfo.items[0].id, 0);
	}
	res.render('video.ejs', {videoInfo: videoInfo.items[0], iframeUrl: iframeUrl});
}

const urlRequest = (url)=>{
	return new Promise(( resolve ,reject )=>{
		https.get(url,
			(res) => {
				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {
					resolve(JSON.parse(data));
				});
			}).on('error', (err) => {
				reject(JSON.parse(err));
			});
		});
}

const youtubeSearch = (opts, callback)=>{
	let q = url.format({
		pathname: '/search',
		query: opts
	});
	urlRequest(config.api_url + q).then(res => callback(null, res)).catch(err => callback(err));	
}

const youtubeVideo = (opts, callback)=>{
	let q = url.format({
		pathname: '/videos',
		query: opts
	});
	urlRequest(config.api_url + q).then(res => callback(null, res)).catch(err => callback(err));
}

app.get('/quality', (req, res)=>{
	selectedQuality = config.qualities[req.query.i];
	res.redirect('/');
});

app.get('/watch', (req, res)=>{
	youtubeVideo({
		id: req.query.v,
		part: 'snippet',
		key: config.api_key
	},
	(err, result)=>{
		if (err) {
			console.log(err);
			res.status(500).send(err);
		} else {
			console.log(result);
			playVideo(res, result, req.query.bp);
		}
	});
})

app.get('/results', (req, res)=>{
	youtubeSearch({
			q: req.query.search_query,
			part: 'snippet',
			type: 'video',
			maxResults: config.results_per_page,
			key: config.api_key
		},
		(err, result)=>{
			if (err) {
				console.log(err);
				res.status(500).send(err);
			} else {
				console.log(result);
				showResults(res, req.query.search_query, result);
			}
		});
});

app.post('/search', (req, res)=>{
	res.redirect(url.format({
		pathname:"/results",
		query: {
			"search_query": req.body.searchQuery
		}
	}));
});

app.get('/', (req, res)=>{
	res.render('index.ejs', {searchQuery: null, results: null, selectedQuality: selectedQuality, qualities: config.qualities});
});

app.listen(config.ports.app, function() {
	console.log("server listening on port " + config.ports.app);
});