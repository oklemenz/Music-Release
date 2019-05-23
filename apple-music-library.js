'use strict';

const fs = require('fs');
const url = require('url');
const request = require('request-promise-native');
const appleMusic = require('./apple-music');

const options = require('./data/options');

let API_ENDPOINT;
let API_HEADERS;

function apiEndpoint() {
    if (!API_ENDPOINT) {
        API_ENDPOINT = [options.host, options.version, options.library].join('/');
    }
    return API_ENDPOINT;
}

function apiHeaders() {
    if (!API_HEADERS) {
        API_HEADERS = {
            Authorization: `Bearer ${appleMusic.jwt()}`,
            'music-user-token': options['music-user-token']
        };
    }
    return API_HEADERS;
}

async function apiCall(path) {
    return request.get({
        url: [apiEndpoint(), path].join('/'),
        headers: apiHeaders(),
        json: true
    });
}


async function fetchAlbums() {
    const albums = [];
    let offset = 0;
    while (offset >= 0) {
        const response = await apiCall(`albums/?offset=${offset}&limit=${options.paging}`);
        albums.push(...response.data);
        if (response.next) {
            offset += options.paging;
        } else {
            offset = -1;
        }
    }
    return albums;
}

async function fetchAlbum(albumId) {
    return (await apiCall(`albums/${albumId}`)).data[0];
}

module.exports = {
    jwt: appleMusic.jwt,
    fetchAlbums,
    fetchAlbum
};
