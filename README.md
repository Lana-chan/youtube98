# Youtube98

A simple node.js server meant to be run in local networks to provide retro
computers with the ability to open and search for Youtube links in a reasonably
modern manner.

This project was inspired by [retro-video-server][1], however instead of a fork
it is rewritten from scratch with a more robust set of routes in order to more
closely mimic the URL structure of the original Youtube website, making for a
better replacement in cases of proxying.

## Standalone usage

!TODO

## WebOne integration

It is possible to use [WebOne][2] to make a proxy rule which will automatically
redirect your browser from Youtube links to your local Youtube98 server:

!TODO

## See also

[retro-video-server][1] - 
 The project which inspired Youtube98

[WebOne][2] - 
 A highly configurable HTTP proxy which serves to make modern websites more
 friendly to retro computers

[1]: https://github.com/keenmaster486/retro-video-server
[2]: https://github.com/atauenis/webone