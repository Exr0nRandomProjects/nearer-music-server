import mpvAPI from "node-mpv";
import SpotifyToYoutube from 'spotify-to-youtube';
import { parse } from "spotify-uri";
import SpotifyWebApi from 'spotify-web-api-node';
import ytdl from "ytdl-core";




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
        console.log("Spotify credentials granted.")
    } catch (e) {
        console.log("Spotify grant credentials error: " + e)
    }
}
grantCredentials()

// HELPER FUNCTIONS
async function convertAnyURLToYouTubeURL(url_or_uri) {
    let ytUrl;
    if (url_or_uri.includes("youtube.com") || url_or_uri.includes("youtu.be")) {
        ytUrl = url_or_uri
    } else if (url_or_uri.includes("spotify")) {
        ytUrl = await spotifyToYoutube(parse(url_or_uri).id).catch(console.error)
    }

    return ytUrl;
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

        ytdl.downloadFromInfo(info)

    } catch (e) {
        console.log(e)
        broadcast("failed", { url: srcUrl })
    }
}

async function main() {
    const playlist_id = '3ktAYNcRHpazJ9qecm3ptn'
    console.log('playlist id', playlist_id)
    await grantCredentials()
    console.log('jello')
    spotifyApi.getPlaylistTracks(playlist_id, {
        limit: 100 // check if .next is null to see if theres another page
    })
    .then(data => data.body.items.map(item => item.track.uri))  // get track uris 
    .then(uris => uris.forEach(uri => enqueue(uri, "exr0n")))
    .catch(() => console.error(`Failed to queue playlist ${playlist_id}`))
}

main()