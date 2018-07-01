'use strict';

const fs = require('fs');
const Nes = require('../dist/nes.node');

const nes = new Nes();
nes.loadCart(fs.readFileSync('./roms/dk.nes'));
nes.start();
