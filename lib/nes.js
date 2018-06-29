'use strict';

import debug from 'debug';
import Cpu from './6502/cpu';
import Mmu from './mmu';

const print = debug('nes');

export default class Nes {
  constructor() {
    const mmu = this.mmu = new Mmu();
    this.cpu = new Cpu(mmu);
  }

  loadCart(buf) {
    // print(String.fromCharCode.apply(null, data.slice(0, 3)));
    // print('$1A', data[3].toString(16));
    // print('16K PRG-ROM page count', data[4].toString(16));
    // print('8K CHR-ROM page count', data[5].toString(2));
    // print('ROM Control Byte #1', data[6].toString(2));
    // print('ROM Control Byte #2', data[7].toString(2));

    this.mmu.loadCart(new Uint8Array(buf));
  }

  start() {
    this.cpu.start();
  }
}
