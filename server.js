const express = require('express');
const path = require('path');
const open = require('open');

const appleMusic = require('./apple-music');

const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT, 10) || 8080;
const publicDir = process.argv[2] || __dirname + '/public';

const app = express();

app.get('/', function (req, res) {
    res.sendFile(path.join(publicDir, '/index.html'));
});

app.get('/token', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({token: appleMusic.jwt()}));
});

app.use(express.static(publicDir));

app.listen(port, () => {
    console.log('Listening at', publicDir, hostname, port);
    open(`http://${hostname}:${port}`);
});

