'use strict';

require('./util');

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
    this.mmu.loadCart(buf);
  }

  start() {
    debug('start');
    this.cpu.start();
  }
}
