const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const publicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEN+26m6nBb8NRVmySJe6bVn4+KT5wU7XfoIb8NKKQfP github-actions-deploy';

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(`mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "${publicKey}" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Key injected with code ' + code);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '178.104.53.121',
  port: 22,
  username: 'root',
  password: 'Xup3aAhUTgEF'
});
