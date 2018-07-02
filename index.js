const fs = require('fs');
const Nes = require('./src/nes');

const nes = new Nes();
nes.loadCart(fs.readFileSync('./roms/dk.nes'));
nes.start();
