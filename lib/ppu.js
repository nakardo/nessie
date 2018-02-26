'use strict';

module.exports = class Ppu {
  constructor() {
    this.memory = new Uint8Array(8);
  }

  readByte(addr) {
    return this.memory[addr & 7];
  }

  writeByte(val, addr) {
    this.memory[addr & 7] = val;
  }
};
