'use strict';

const BANDS = 'bands.json';
const MUSIC = 'music.json';

const fs = require('fs');
const appleMusic = require('./apple-music');

const bands = require(`./${BANDS}`);
const music = require(`./${MUSIC}`);

const NAME_TERM_BLACKLIST = [
    'Video', 'Acoustic', 'Live', '- EP', 'E.P.'
];

async function process() {
    await Promise.all(bands.map(async (bandName) => {
        let band = music[bandName];
        if (!band) {
            band = {name: bandName};
            music[bandName] = band;
        }
        await fillId(band);
        await fillAlbums(band);
    }));

    console.log('# New Albums:');
    bands.map((bandName) => {
        const band = music[bandName];
        reportNewAlbums(band);
    });

    console.log('\n');

    console.log('# Next Album expected:');
    bands.map((bandName) => {
        const band = music[bandName];
        reportNextAlbumExpected(band);
    });
}

async function fillId(band) {
    if (!band.id) {
        band.id = await appleMusic.searchArtist(band.name);
    }
}

function reportNewAlbums(band) {
    band.albums.forEach((album) => {
        if (album.new) {
            console.log(`  ${band.name} - ${album.name}`);
        }
    });
}

function reportNextAlbumExpected(band) {
    if (band.albums.length === 0) {
        return;
    }
    const currentYear = (new Date()).getFullYear();
    const diffs = [];
    let previousValue;
    band.albums.map((album) => {
        return album.releaseYear;
    }).sort().reverse().forEach((value) => {
        if (previousValue) {
            diffs.push(previousValue - value);
        }
        previousValue = value;
    });
    const lastAlbum = band.albums[0];
    let nextReleaseYear = lastAlbum.releaseYear + Math.round(diffs.reduce((sum, value) => {
        return sum + value;
    }, 0) / diffs.length);
    if (nextReleaseYear < currentYear) {
        nextReleaseYear = currentYear;
    }
    band.nextReleaseYear = nextReleaseYear;
    console.log(`  ${band.name} - ${nextReleaseYear}`);
}

async function fillAlbums(band) {
    const currentYear = (new Date()).getFullYear();
    band.albums = band.albums || [];
    const albums = await appleMusic.fetchArtistAlbums(band.id);
    albums.filter((album) => {
        return !album.attributes.isSingle && album.attributes.isComplete &&
            !NAME_TERM_BLACKLIST.find((term) => {
                return album.attributes.name.includes(term);
            });
    }).sort((a, b) => {
        return a.attributes.releaseDate < b.attributes.releaseDate ? 1 : -1;
    }).forEach((album) => {
        let albumName = album.attributes.name;
        const bracketStart = albumName.indexOf('(');
        if (bracketStart > 0) {
            albumName = albumName.substr(0, bracketStart - 1);
        }
        const existingAlbum = band.albums.find((existingAlbum) => {
            return existingAlbum.id === album.id;
        });
        const albumData = {
            id: album.id,
            name: albumName,
            releaseDate: album.attributes.releaseDate,
            releaseYear: parseInt(album.attributes.releaseDate.substr(0, 4))
        };
        if (existingAlbum) {
            if (albumData.releaseYear !== currentYear) {
                delete existingAlbum.new;
            }
            Object.assign(existingAlbum, albumData);
        } else {
            if (band.albums.find((album) => {
                return album.name === albumName;
            })) {
                return;
            }
            if (albumData.releaseYear === currentYear) {
                albumData.new = true;
            }
            band.albums.push(albumData);
        }
    });
    band.albums.sort((a, b) => {
        return a.releaseDate < b.releaseDate ? 1 : -1;
    });
}

function writeMusic() {
    fs.writeFileSync(MUSIC, JSON.stringify(music, null, 2));
}

process().then(() => {
    writeMusic();
    console.log('finished');
});
