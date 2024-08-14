# fix on 2024-08-14 by exr0n
- added to a github repo 
- mpv youtube playing seemed to have failed because youtube-dl died.
	- switching to yt-dlp via [config file](https://www.funkyspacemonkey.com/replace-youtube-dl-with-yt-dlp-how-to-make-mpv-work-with-yt-dlp) didn't work, and the sample config doesn't even contain that key
	- instead, installing yt-dlp via pip and symlinking to /usr/local/bin/youtube-dl worked allows us to play with `mpv youtube_url --no-video`
- mpv-node is very out of date. [migrate to mpv-node 2](https://github.com/j-holub/Node-MPV/blob/master/migrationguide.md)

