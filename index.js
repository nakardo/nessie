'use strict';

const Fs = require('fs');
const RomData = new Uint8Array(Fs.readFileSync('./roms/dk.nes'));
const Nes = require('./lib/nes');

const nes = new Nes();
nes.loadCart(RomData);
nes.start();
