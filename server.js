import betterSqlite3 from "better-sqlite3";
import { readFileSync } from 'fs';
import { createServer } from 'https';
import mpvAPI from "node-mpv";
import SpotifyToYoutube from 'spotify-to-youtube';
import { parse } from "spotify-uri";
import SpotifyWebApi from 'spotify-web-api-node';
import { WebSocket, WebSocketServer } from "ws";
import ytdl from "ytdl-core";



function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const spotifyApi = new SpotifyWebApi({
    clientId: "745eb77e7f074d938c34f5371de297c1",
    clientSecret: "755400b349f541e4aa84660ecf34fa85"
});
const spotifyToYoutube = SpotifyToYoutube(spotifyApi)

// client credentials grant
async function grantCredentials() {
    try {
        const data = await spotifyApi.clientCredentialsGrant().catch(console.error)
        spotifyApi.setAccessToken(data.body['access_token']);
        setTimeout(grantCredentials, data.body['expires_in'] * 1000);
    } catch (e) {
        console.log("Spotify grant credentials error: " + e)
    }
}
grantCredentials()

// HELPER FUNCTIONS
async function convertAnyURLToYouTubeURL(url) {
    let ytUrl;
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        ytUrl = url
    } else if (url.includes("spotify")) {
        ytUrl = await spotifyToYoutube(parse(url).id).catch(console.error)
    }

    return ytUrl;
}

// SQLITE
console.log("connecting to database");
const db = betterSqlite3("nearer.db");
db.pragma(`journal_mode = WAL`);
db.exec(`CREATE TABLE IF NOT EXISTS queue 
(   id INTEGER PRIMARY KEY, 
    srcUrl TEXT,
    playUrl TEXT,
    title TEXT,
    length INTEGER,
    thumbnail TEXT,
    queuedBy TEXT,
    queuedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    skipped INTEGER DEFAULT 0)`);

db.exec(`CREATE TABLE IF NOT EXISTS log
(   id INTEGER PRIMARY KEY,
    type TEXT,
    data TEXT,
    user TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)

// STATE
console.log(`initializing player state`)
var playerState = {
    playing: true,
    loading: false,
    time: 0,
    volume: 0.2,
    currentSong: null
}

// MPV
console.log("initializing mpv");
const mpvPlayer = new mpvAPI({ "audio-only": true }, ['--no-video'])

mpvPlayer.start()
.then(() => {
    console.log("MPV initialized successfully. setting up other servers")

    mpvPlayer.on("stopped", function () {
        console.log("player stop")
        next();
    })

    mpvPlayer.on("timeposition", function (time) {
        console.log("timeposition")
        setTime(parseInt(time))
    })

    mpvPlayer.on('statuschange', mpvStatus => {
        console.log('mpvstatus', mpvStatus);
    })


    // TODO: put back
    // // send time position every second
    // setInterval(() => {
    //     if (playerState.playing) {
    //         mpvPlayer.getTimePosition().then((time) => {
    //             setTime(parseInt(time))
    //         }).catch(console.error)
    //     }
    // }, 1000)




    // EVENT HELPERS
    async function storeInLog(type, data, user) {
        const timestamp = new Date().toISOString();
        const stmt = db.prepare("INSERT INTO log (type, data, user, timestamp) VALUES (?, ?, ?, ?)");
        stmt.run(type, data, user, timestamp);
        broadcast("log", { entry: { type, data, user, timestamp } });
    }

    // EVENT HANDLERS
    async function enqueue(srcUrl, queuedBy) {
        console.log(`${queuedBy} added ${srcUrl} to queue`)

        try {
            const ytUrl = await convertAnyURLToYouTubeURL(srcUrl);

            const info = await ytdl.getInfo(ytUrl)
            const title = info.videoDetails.title
            const length = info.videoDetails.lengthSeconds
            const thumbnail = info.videoDetails.thumbnails[0].url

            // const format = ytdl.chooseFormat(ytdl.filterFormats(info.formats, "audioonly"), { quality: "highestaudio" });
            // const playUrl = format.url; // TODO: just use youtube url

            const playUrl = ytUrl;
            console.log("queueing ", ytUrl)

            // store in queue
            const stmt = db.prepare("INSERT INTO queue (srcUrl, playUrl, title, length, thumbnail, queuedBy) VALUES (?, ?, ?, ?, ?, ?)");
            const res = stmt.run(srcUrl, playUrl, title, length, thumbnail, queuedBy);

            storeInLog("enqueue", title, queuedBy)

            if (!playerState.currentSong) {
                next();
            }

            broadcast("queued", { song: { id: res.lastInsertRowid, srcUrl, playUrl, title, length, thumbnail, queuedBy } });
        } catch (e) {
            console.log(e)
            broadcast("failed", { url: srcUrl })
        }
    }

    async function play() {
        playerState.playing = true;
        await mpvPlayer.play().catch(console.error)
        broadcast("playing", { playing: true });
    }

    async function pause() {
        playerState.playing = false;
        await mpvPlayer.pause().catch(console.error)
        broadcast("playing", { playing: false });
    }

    async function setVolume(volume) {
        playerState.volume = volume;
        await mpvPlayer.volume(volume * 100).catch(console.error)
        broadcast("volume", { volume });
    }

    function setCurrentSong(currentSong) {
        playerState.currentSong = currentSong;
        broadcast("currentSong", { currentSong });
    }

    function setLoading(loading) {
        playerState.loading = loading;
        broadcast("loading", { loading });
    }

    function setTime(time) {
        playerState.time = time;
        broadcast("time", { time });
    }

    async function next() {
        const newCurrentSong = playerState?.currentSong ?
            db.prepare("SELECT * FROM queue WHERE id > ? ORDER BY id ASC LIMIT 1").get(playerState?.currentSong?.id) :
            db.prepare("SELECT * FROM queue ORDER BY id DESC LIMIT 1").get();

        if (!newCurrentSong) {
            setCurrentSong(null)
            setTime(0);
            await mpvPlayer.pause().catch(console.error);
            return;
        }

        setLoading(true)
        setCurrentSong(newCurrentSong)
        setTime(0);

        await mpvPlayer.load(newCurrentSong.playUrl).catch(console.error)
        await mpvPlayer.play().catch(console.error)

        setLoading(false);
    }





    // WEBSOCKET
    console.log("starting websocket server at port 3002");
    const server = createServer({
        cert: readFileSync('/etc/letsencrypt/live/nearer.blacker.caltech.edu/cert.pem'),
        key: readFileSync('/etc/letsencrypt/live/nearer.blacker.caltech.edu/privkey.pem')
    });
    const wss = new WebSocketServer({ server });

    // broadcast function
    const broadcast = (type, data) => {
        console.log("broadcasting", type, JSON.stringify(data))
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type, ...(data || {}) }));
            }
        });
    };

    // server
    var timeout;
    wss.on("connection", (ws) => {
        console.log("client connected");

        // get last 10 songs from queue and send it along the initial player state
        const queue = db.prepare("SELECT * FROM queue ORDER BY id DESC LIMIT 10").all()
        const log = db.prepare("SELECT * FROM log ORDER BY id DESC LIMIT 10").all()
        // send initial data
        ws.send(JSON.stringify({ type: "init", queue, log, playerState }));

        ws.on("message", async function (data) {
            const message = JSON.parse(decodeURIComponent(data));
            switch (message.type) {
                case "enqueue":
                    enqueue(message.url, message.user);
                    break;
                case "play":
                    storeInLog("play", null, message.user)
                    await play().catch(console.error);
                    break;
                case "pause":
                    storeInLog("pause", null, message.user)
                    await pause().catch(console.error);
                    break;
                case "skip":
                    storeInLog("skip", playerState.currentSong.title, message.user)
                    next();
                    break;
                case "volume":
                    // debounce logging to 0.5s
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        storeInLog("volume", message.volume, message.user)
                    }, 500)

                    await setVolume(message.volume).catch(console.error);
                    break;
            }
        });
    });

    server.listen(8080);
    console.log("server listening at 8080")
})
.catch((error) => {
	console.error("MPV Failed to initialize. Aborting.");
	console.error(error);
})



process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    console.log(reason.stack)
    // application specific logging, throwing an error, or other logic here
});