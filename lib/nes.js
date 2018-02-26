'use strict';

const Debug = require('debug')('nes');
const Cpu = require('./cpu');
const Mmu = require('./mmu');

module.exports = class Nes {
  constructor() {
    const mmu = this.mmu = new Mmu();
    this.cpu = new Cpu(mmu);
  }

  loadCart(data) {
    Debug(String.fromCharCode.apply(null, data.slice(0, 3)));
    Debug('$1A', data[3].toString(16));
    Debug('16K PRG-ROM page count', data[4].toString(16));
    Debug('8K CHR-ROM page count', data[5].toString(2));
    Debug('ROM Control Byte #1', data[6].toString(2));
    Debug('ROM Control Byte #2', data[7].toString(2));

    this.mmu.loadCart(data);
  }

  start() {
    this.cpu.start();
  }
}
