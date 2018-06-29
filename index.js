'use strict';

import fs from 'fs';
import Nes from './lib/nes';

const nes = new Nes();
nes.loadCart(fs.readFileSync('./roms/dk.nes'));
nes.start();
