// global to contain musicKit
let music;
let musicUserToken;

function getEl(id) {
    return document.getElementById(id);
}

function copyToClipboard(id) {
    var copyText = document.getElementById(id);
    var textArea = document.createElement('textarea');
    textArea.value = copyText.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('Copy');
    textArea.remove();
}

document.addEventListener('musickitloaded', () => {
    // MusicKit global is now defined
    fetch('/token').then(response => response.json()).then(res => {
        music = MusicKit.configure({
            developerToken: res.token,
            app: {
                name: 'TestAppleMusicKit',
                build: '1978.4.1'
            }
        });

        // setup click handlers
        getEl('add-to-q-btn').addEventListener('click', () => {
            const idInput = getEl('id-input');
            const typeInput = getEl('type-input');

            music.setQueue({
                [typeInput.value]: idInput.value
            });

            idInput.value = '';
            typeInput.value = '';
        });

        getEl('play-btn').addEventListener('click', () => {
            music.play();
        });

        getEl('pause-btn').addEventListener('click', () => {
            music.pause();
        });

        getEl('login-btn').addEventListener('click', () => {
            music.authorize().then(_musicUserToken => {
                musicUserToken = _musicUserToken;
                document.getElementById('music-user-token').textContent = musicUserToken;
            });
        });

        getEl('copy-btn').addEventListener('click', () => {
            copyToClipboard('music-user-token');
        });
    });
});
