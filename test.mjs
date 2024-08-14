import betterSqlite3 from "better-sqlite3";
import { readFileSync } from 'fs';
import { createServer } from 'https';
import mpvAPI from "node-mpv";
import SpotifyToYoutube from 'spotify-to-youtube';
import { parse } from "spotify-uri";
import SpotifyWebApi from 'spotify-web-api-node';
import { WebSocket, WebSocketServer } from "ws";
import ytdl from "ytdl-core";

// where you import your packages
//const mpvAPI = require('node-mpv');
// where you want to initialise the API
const mpv = new mpvAPI();

// somewhere within an async context
// starts MPV
try{
	console.log('starting')
  await mpv.start()
	console.log("started");
  // loads a file
  await mpv.load('rapoftimes.wav');
	console.log("loaded");
  // file is playing
  // sets volume to 70%
  await mpv.volume(70);
}
catch (error) {
  // handle errors here
  console.log(error);
}

//console.log("loading song from ytdl...")
//
//var mpvPlayer = new mpv({ 'audio_only': true, 'verbose': true });
//
/////const ytUrl = "https://www.youtube.com/watch?v=pxw-5qfJ1dk"
/////const info = await ytdl.getInfo(ytUrl)
/////const format = ytdl.chooseFormat(ytdl.filterFormats(info.formats, "audioonly"), { quality: "highestaudio" });
/////const playUrl = format.url
/////console.log("loading url", playUrl);
// 
//// This will load and start the song
////mpvPlayer.load(playUrl);
//
//mpvPlayer.load("rapoftimes.wav")
//mpvPlayer.play();
// 
//// This will bind this function to the stopped event
//mpvPlayer.on('stopped', function() {
//  console.log("Your favorite song just finished, let's start it again!");
//});
// 
//// Set the volume to 50%
//mpvPlayer.volume(50);
//
//
//console.log("should be playing....")
// 
//// Stop to song emitting the stopped event
//mpvPlayer.stop();
//
//
//
//
