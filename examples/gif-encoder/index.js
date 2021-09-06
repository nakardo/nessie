'use strict';

import fs from 'fs';
import path from 'path';
import GIFEncoder from 'gifencoder';
import Nes from '../../src/nes';

const filename = process.argv.slice(2).pop();

const encoder = new GIFEncoder(256, 240);
encoder
  .createReadStream()
  .pipe(fs.createWriteStream(path.resolve(__dirname, 'out.gif')));
encoder.start();
encoder.setRepeat(0);
encoder.setDelay(1000 / 60);

const nes = new Nes({
  onFrame(canvas) {
    encoder.addFrame(canvas.getContext('2d'));
  },
});
nes.loadCart(fs.readFileSync(filename));
nes.start();

process.on('SIGINT', () => {
  encoder.finish();
  process.exit(0);
});
