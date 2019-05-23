const appleMusicLibrary = require('./apple-music-library');

async function processMusic() {
    let albums = await appleMusicLibrary.fetchAlbums();

    let albumsDuplicateTracks = [];
    let albumsMissingTracks = [];
    await albums.reduce(async (promise, album) => {
        await promise;
        let albumDetails = await processAlbum(album);
        await checkDuplicateTracks(albumDetails, albumsDuplicateTracks);
        await checkMissingTracks(albumDetails, albumsMissingTracks);
    }, Promise.resolve());

    console.log('# Duplicate tracks:');
    albumsDuplicateTracks.forEach((album) => {
        console.log(`    ${album.attributes.artistName} - ${album.attributes.name}: ${album.id}`);
    });

    console.log();

    console.log('# Missing tracks:');
    albumsMissingTracks.forEach((album) => {
        console.log(`    ${album.attributes.artistName} - ${album.attributes.name}: ${album.id}`);
    });
}

async function processAlbum(album) {
    return await appleMusicLibrary.fetchAlbum(album.id);
}

function groupTrackNumbers(album) {
    return album.relationships.tracks.data.reduce((result, track) => {
        let trackNumber = track.attributes.trackNumber;
        result[trackNumber] = result[trackNumber] || 0;
        result[trackNumber]++;
        return result;
    }, []);
}

function checkDuplicateTracks(album, result) {
    let trackNumbers = groupTrackNumbers(album);
    if (trackNumbers.find((count) => {
        return count > 1;
    })) {
        result.push(album);
    }
}

function checkMissingTracks(album, result) {
    let trackNumbers = groupTrackNumbers(album);
    for (let i = 1; i < trackNumbers.length; i++) {
        if (trackNumbers[i] === undefined)  {
            result.push(album);
            return
        }
    }
}

processMusic().then(() => {
    console.log();
    console.log('Done!');
}).catch((error) => {
    console.log(error);
});
