# fix on 2024-08-14 by exr0n
- added to a github repo 
- mpv youtube playing seemed to have failed because youtube-dl died.
	- switching to yt-dlp via [config file](https://www.funkyspacemonkey.com/replace-youtube-dl-with-yt-dlp-how-to-make-mpv-work-with-yt-dlp) didn't work, and the sample config doesn't even contain that key
	- instead, installing yt-dlp via pip and symlinking to /usr/local/bin/youtube-dl worked allows us to play with `mpv youtube_url --no-video`
- mpv-node is very out of date. [migrate to mpv-node 2](https://github.com/j-holub/Node-MPV/blob/master/migrationguide.md)
	- restructured the code to only start defining hooks once the mpv connection was up and running
- the mpv socket was failing to load youtube URLs. `ytdl://` didn't work, checked other repos on github for example usage, and that didn't work
	- node-mpv verbose mode showed that it was connecting to an existing socket
	- found the commands documentation by searching the name of a broken link on github. sending the json ipc command directly gave "success", but did not play anything on nearer. this led to the realization that there was a ghost socket which was a different mpv process than the one launched from command line
	- now, test.mjs creates/kills a new mpv process as expected, but the load command is timing out
	- grabbing the original launch command from the ghost socket `lsof` via `ps`, we see logging is no except ipc is verbose. reusing that command with log=v shows that our ipc command was successfully sent but mpv was failing to open a video out. adding --no-video fixes that
- it seems adding `['--no-video']` to the launch fixes it! 

