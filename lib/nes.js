'use strict';

import {debug as Debug} from 'debug';
import Cpu from './6502/cpu';
import Mmu from './mmu';

const debug = Debug('nes');

export default class Nes {
  constructor() {
    const mmu = this.mmu = new Mmu();
    this.cpu = new Cpu(mmu);
  }

  loadCart(buf) {
    // debug(String.fromCharCode.apply(null, buf.slice(0, 3)));
    // debug('$1A', buf[3].toString(16));
    // debug('16K PRG-ROM page count', buf[4].toString(16));
    // debug('8K CHR-ROM page count', buf[5].toString(2));
    // debug('ROM Control Byte #1', buf[6].toString(2));
    // debug('ROM Control Byte #2', buf[7].toString(2));

    this.mmu.loadCart(buf);
  }

  start() {
    this.cpu.start();
  }
}
