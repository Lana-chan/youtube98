const config        = require('./config.json');
const https         = require('https');
const http          = require('http');
const { spawn }     = require('child_process');
const kill          = require('tree-kill');
const url           = require('url');
const express       = require('express');
const fs            = require('fs');
const path          = require('path');
const app = express();

var vlcProcess = null;
let selectedQuality = config.qualities[config.default_quality];
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));

const replaceHome = (path) => {
	return path.replace('~', process.env.HOME);
}

const spawnYTDLP = (video_id) => {
	return new Promise(( resolve ,reject )=>{
		const args = [
			"-f",
			"b",
			"-g",
			"https://www.youtube.com/watch?v=" + video_id
		];

		ytdlpProcess = spawn(replaceHome(config.paths.yt_dlp), args);

		ytdlpProcess.stdout.on('data', (data) => {
			console.log(`stdout: ${data}`);
			spawnVLC(data.toString('utf8').trim()).then(() => {resolve();});
		});
	});
}

const spawnVLC = (url)=>{
	return new Promise(( resolve ,reject )=>{
		if (vlcProcess != null)	{
			vlcProcess.kill('SIGKILL');
			vlcProcess = null
			console.log("Tried to kill process");
		}

		const args = [
			"-vvv",
			"--preferred-resolution=" + config.preferred_resolution,
			"--network-caching=" + config.cache_milliseconds,
			"--sout-livehttp-caching",
			"--sout",
			"#transcode{" + selectedQuality.transcode + "}:standard{access=http{mime=" + selectedQuality.mime + "},dst=0.0.0.0:" + config.ports.vlc + selectedQuality.extra + "}",
			"-I",
			"http",
			"--http-host",
			"127.0.0.1",
			"--http-port",
			config.ports.vlc_control,
			"--start-paused",
			url
		];

		console.log(args.join(' '));

		vlcProcess = spawn(config.paths.cvlc, args);

		vlcProcess.stdout.on('data', (data) => {
			console.log(`stdout: ${data}`);
		});

		vlcProcess.stderr.on('data', (data) => {
			console.error(`stderr: ${data}`);
		});

		vlcProcess.on('close', (code) => {
			console.log(`NODE: child process exited with code ${code}`);
		});

		resolve();
	});
}

const showResults = (res, searchQuery, results)=>{
	res.render('index.ejs', {searchQuery: searchQuery, results: results, selectedQuality: selectedQuality, qualities: config.qualities});
}

const playVideo = (res, videoInfo, bypass)=>{
	if (bypass == 1) {
		iframeUrl = "https://youtube.com/embed/" + videoInfo.items[0].id
		res.render('video.ejs', {videoInfo: videoInfo.items[0], iframeUrl: iframeUrl});
	} else {
		iframeUrl = "http://" + config.server_url + ":" + config.ports.vlc
		spawnYTDLP(videoInfo.items[0].id).then(() => {
			res.render('video.ejs', {videoInfo: videoInfo.items[0], iframeUrl: iframeUrl});
		});
	}
}

const urlRequest = (url, secure=true)=>{
	let protocol = (secure ? https : http);
	return new Promise(( resolve ,reject )=>{
		protocol.get(url,
			(res) => {
				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {
					try {
						resolve(JSON.parse(data));
					} catch (e) {
						resolve(true);
					}
				});
			}).on('error', (err) => {
				try {
					reject(JSON.parse(err));
				} catch (e) {
					reject();
				}
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
	if (req.query.search_query) {
		res.redirect(url.format({
			pathname:"/results",
			query: {
				"search_query": req.query.search_query
			}
		}));
	} else {
		res.redirect('/');
	}
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
			key: config.api_key,
			pageToken: req.query.page_token
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
			"search_query": req.body.search_query
		}
	}));
});

app.post('/control', (req, res)=>{
	if ('play' in req.body) {
		console.log("play")
		urlRequest(`http://localhost:${config.ports.vlc_control}/requests/status.xml?command=pl_play`, false).then(() => {}).catch(() => {});
	} else if ('pause' in req.body) {
		urlRequest(`http://localhost:${config.ports.vlc_control}/requests/status.xml?command=pl_pause`, false).then(() => {}).catch(() => {});
	}
	res.sendStatus(200);
});

app.get('/', (req, res)=>{
	res.render('index.ejs', {searchQuery: null, results: null, selectedQuality: selectedQuality, qualities: config.qualities});
});

app.listen(config.ports.app, function() {
	console.log("server listening on port " + config.ports.app);
});