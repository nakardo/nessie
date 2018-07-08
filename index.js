const fs = require('fs');
const Nes = require('./src/nes');

const nes = new Nes();
nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/01-basics.nes'));
nes.start();
