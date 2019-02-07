'use strict';

const fs = require('fs');
const url = require('url');
const request = require('request-promise-native');
const jsonWebToken = require('jsonwebtoken');

const options = require('./data/options');

let API_JWT;
let API_ENDPOINT;
let API_HEADERS;

function jwt() {
    if (!API_JWT) {
        const privateKey = fs.readFileSync(options['private-key']).toString();
        const teamId = options['team-id']; // your 10 character apple team id, found in https://developer.apple.com/account/#/membership/
        const keyId = options['key-id']; // your 10 character generated music key id. more info https://help.apple.com/developer-account/#/dev646934554
        API_JWT = jsonWebToken.sign({}, privateKey, {
            algorithm: 'ES256',
            expiresIn: '180d',
            issuer: teamId,
            header: {
                alg: 'ES256',
                kid: keyId
            }
        });
    }
    return API_JWT;
}

function apiEndpoint() {
    if (!API_ENDPOINT) {
        API_ENDPOINT = [options.host, options.version, options.resource, options.storefront].join('/');
    }
    return API_ENDPOINT;
}

function apiHeaders() {
    if (!API_HEADERS) {
        API_HEADERS = {
            Authorization: `Bearer ${jwt()}`,
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

async function searchArtist(name) {
    return (await apiCall(`search?term=${name}&limit=1&types=artists`)).results.artists.data[0].id;
}

async function fetchArtist(artistId) {
    return (await apiCall(`artists/${artistId}`)).data;
}

async function fetchArtistAlbums(artistId) {
    const albums = [];
    let offset = 0;
    while (offset >= 0) {
        const response = await apiCall(`artists/${artistId}/albums?offset=${offset}&limit=${options.paging}`);
        albums.push(...response.data);
        if (response.next) {
            offset += options.paging;
        } else {
            offset = -1;
        }
    }
    return albums;
}

module.exports = {
    jwt,
    searchArtist,
    fetchArtist,
    fetchArtistAlbums
};
