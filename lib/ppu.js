'use strict';

export default class Ppu {
  constructor() {
    this.memory = new Uint8Array(8);
  }

  r8(addr) {
    return this.memory[addr & 7];
  }

  w8(val, addr) {
    this.memory[addr & 7] = val;
  }
};
