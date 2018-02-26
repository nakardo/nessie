'use strict';

const Fs = require('fs');
const RomData = new Uint8Array(Fs.readFileSync('./roms/dk.nes'));
const Nes = require('./lib/nes');

const nes = new Nes();
nes.loadCart(RomData);
nes.start();

// console.log(String.fromCharCode.apply(null, data.slice(0, 3)));
// console.log('$1A', data[3].toString(16));
// console.log('16K PRG-ROM page count', data[4].toString(16));
// console.log('8K CHR-ROM page count', data[5].toString(2));
// console.log('ROM Control Byte #1', data[6].toString(2));
// console.log('ROM Control Byte #2', data[7].toString(2));
