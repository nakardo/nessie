const fs = require('fs');
const Nes = require('./src/nes');

const nes = new Nes();
nes.loadCart(fs.readFileSync('./roms/01-implied.nes'));
nes.start();
