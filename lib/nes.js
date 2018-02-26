'use strict';

const Cpu = require('./cpu');
const Mmu = require('./mmu');

module.exports = class Nes {
  constructor() {
    const mmu = this.mmu = new Mmu();
    this.cpu = new Cpu(mmu);
  }

  loadCart(data) {
    this.mmu.loadCart(data);
  }

  start() {
    this.cpu.start();
  }
}
