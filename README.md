# Youtube98

A simple node.js server meant to be run in local networks to provide retro
computers with the ability to open and search for Youtube links in a reasonably
modern manner.

This project was inspired by Collin Brockway's [retro-video-server][1], however
it is rewritten from scratch with a more robust set of routes in order to more
closely mimic the URL structure of the original Youtube website, making for a
better replacement in cases of proxying.

## Requirements

### Host

A reasonably modern server with the following:

* Node.js
* VLC
* Some form of networking between host and your retro client

To setup the server, run `npm install`, then modify the `config.json.example`
file to meet your needs and save it as `config.json`. To use this server, you
must register a Google API application in order to [obtain a Youtube API key][3]

### Client

* Network connection
* Mozilla-based browser
* VLC with NPAPI (Mozilla) plugin

This has been so far tested on a Pentium II laptop running Windows 98 using the
RetroZilla 2.2 browser and VLC version 0.8.6i, but should be able to run on any
similar combination of hardware and software that meet those requirements.

## Standalone usage

The server can be run simply by `node server.js`, however in order to keep it
running more permanently, a monitor such as [nodemon][4] can be used. Once you
have the server running, simply browse to the URL or IP address in your config
on your retro machine.

You can locally redirect traffic to regular Youtube links in your client by
adding a line in your client's hosts file to resolve `www.youtube.com` to your
host, and running an nginx proxy in your host, such as:

```
server {
	listen 80;
	server_name youtube.com www.youtube.com;

	location / {
		proxy_pass         http://127.0.0.1:3000;
		proxy_set_header   Host $host:$server_port;
	}
}
```

## WebOne integration

It is possible to use [WebOne][2] to make a proxy rule which will automatically
redirect your browser from Youtube links to your local Youtube98 server. Add
the following lines to your `webone.conf`:

```
[Edit:^http:\/\/(www.)?youtube.com\/(.*)]
AddInternalRedirect=http://LOCAL_URL:PORT/$2
```

replacing `LOCAL_URL` and `PORT` with the respective values for your own setup.

[1]: https://github.com/keenmaster486/retro-video-server
[2]: https://github.com/atauenis/webone
[3]: https://developers.google.com/youtube/registering_an_application
[4]: https://nodemon.io/