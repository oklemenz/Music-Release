'use strict';

const BANDS = './data/bands.json';
const MUSIC = './data/music.json';

const fs = require('fs');

const options = require('./data/options');
const nameStopWords = require('./data/stopwords');
const appleMusic = require('./apple-music');

const bands = require(BANDS);
const music = require(MUSIC);

async function processMusic() {
    bands.sort();
    if (options.sync) {
        await bands.reduce(async (promise, bandName) => {
            await promise;
            let band = music[bandName];
            if (!band) {
                band = {name: bandName};
                music[bandName] = band;
            }
            await fillId(band);
            await fillAlbums(band);
        }, Promise.resolve());
    }
    calcNewAlbums();
    calcNextAlbumExpected();
    logNewAlbums();
    console.log();
    logNextAlbumExpected();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fillId(band) {
    if (!band.id) {
        band.id = await appleMusic.searchArtist(band.name);
    }
    if (!band.id) {
        throw new Error(`Cannot find band '${band.name}' in catalog`);
    }
}

async function fillAlbums(band) {
    band.albums = band.albums || [];
    const albums = await appleMusic.fetchArtistAlbums(band.id);
    albums.filter((album) => {
        return !album.attributes.isSingle && album.attributes.isComplete &&
            !nameStopWords.find((term) => {
                return album.attributes.name.toLowerCase().includes(term.toLowerCase());
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
            Object.assign(existingAlbum, albumData);
        } else {
            if (band.albums.find((album) => {
                return album.name.toLowerCase() === albumName.toLowerCase();
            })) {
                return;
            }
            band.albums.push(albumData);
        }
    });
    band.albums.sort((a, b) => {
        return a.releaseDate < b.releaseDate ? 1 : -1;
    });
}

function calcNewAlbums() {
    const currentYear = (new Date()).getFullYear();
    Object.keys(music).forEach((bandName) => {
        const band = music[bandName];
        band.albums.forEach((album) => {
            if (album.releaseYear === currentYear) {
                album.new = true;
            } else {
                delete album.new;
            }
        });
        band.albumCount = band.albums.length;
    });
}

function calcNextAlbumExpected() {
    Object.keys(music).forEach((bandName) => {
        const band = music[bandName];
        if (band.albums.length === 0) {
            band.avgReleaseYear = 0;
            band.nextReleaseYear = 0;
            return;
        } else if (band.albums.length === 1) {
            band.avgReleaseYear = options.defaultReleaseYears;
            band.nextReleaseYear = band.albums[0].releaseYear + band.avgReleaseYear;
            return;
        }
        const diffs = [];
        let previousValue;
        [...new Set(band.albums.map((album) => {
            return album.releaseYear;
        }).sort().reverse())].forEach((value) => {
            if (previousValue) {
                diffs.push(previousValue - value);
            }
            previousValue = value;
        });
        band.avgReleaseYear = Math.round(diffs.reduce((sum, value) => {
            return sum + value;
        }, 0) / diffs.length);
        band.nextReleaseYear = band.albums[0].releaseYear + band.avgReleaseYear;
    });
}

function logNewAlbums() {
    console.log('# New Albums:');
    Object.keys(music).forEach((bandName) => {
        const band = music[bandName];
        band.albums.forEach((album) => {
            if (album.new) {
                console.log(`  ${band.name} - ${album.name}`);
            }
        });
    });
}

function logNextAlbumExpected() {
    const currentYear = (new Date()).getFullYear();
    const groupYear = {};
    Object.keys(music).forEach((bandName) => {
        const band = music[bandName];
        groupYear[band.nextReleaseYear] = groupYear[band.nextReleaseYear] || [];
        groupYear[band.nextReleaseYear].push(bandName);
    });
    Object.keys(groupYear).forEach((year) => {
        groupYear[year].sort();
    });

    console.log('# Next Album expected:');
    Object.keys(groupYear).filter(year => year >= currentYear).sort().forEach((year) => {
        console.log(`## ${year}: `);
        groupYear[year].forEach((bandName) => {
            console.log(`    ${bandName}`);
        });
    });

    console.log();

    console.log('# Album Overdue:');
    Object.keys(groupYear).filter(year => year < currentYear).sort().reverse().forEach((year) => {
        console.log(`## ${year}: `);
        groupYear[year].forEach((bandName) => {
            console.log(`    ${bandName}`);
        });
    });

}

function writeBands() {
    fs.writeFileSync(BANDS, JSON.stringify(bands, null, 2));
}

function writeMusic() {
    fs.writeFileSync(MUSIC, JSON.stringify(music, null, 2));
}

options.sync = process.argv[2] === 'sync';
processMusic().then(() => {
    writeBands();
    writeMusic();
    console.log();
    console.log('Done!');
}).catch((error) => {
    console.log(error);
});
