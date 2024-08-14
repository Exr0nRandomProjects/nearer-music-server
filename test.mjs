import betterSqlite3 from "better-sqlite3";
import { readFileSync } from 'fs';
import { createServer } from 'https';
import mpv from "node-mpv";
import SpotifyToYoutube from 'spotify-to-youtube';
import { parse } from "spotify-uri";
import SpotifyWebApi from 'spotify-web-api-node';
import { WebSocket, WebSocketServer } from "ws";
import ytdl from "ytdl-core";

console.log("loading song from ytdl...")

var mpvPlayer = new mpv({ 'audio-only': true });

const ytUrl = "https://www.youtube.com/watch?v=pxw-5qfJ1dk"
const info = await ytdl.getInfo(ytUrl)
const format = ytdl.chooseFormat(ytdl.filterFormats(info.formats, "audioonly"), { quality: "highestaudio" });
const playUrl = format.url
console.log("loading url", playUrl);
 
// This will load and start the song
mpvPlayer.load(playUrl);
mpvPlayer.play();
 
// This will bind this function to the stopped event
mpvPlayer.on('stopped', function() {
  console.log("Your favorite song just finished, let's start it again!");
});
 
// Set the volume to 50%
mpvPlayer.volume(50);


console.log("should be playing....")
 
// Stop to song emitting the stopped event
mpvPlayer.stop();
