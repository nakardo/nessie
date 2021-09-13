import assert from 'assert';
import {UnmappedAddressError} from '../errors';

export default class Memory {
  nes = null;
  vram = [
    new Uint8Array(0x400),
    new Uint8Array(0x400),
    new Uint8Array(0x400),
    new Uint8Array(0x400),
  ];
  palette = new Uint8Array(0x20);

  constructor(nes) {
    this.nes = nes;
    Object.seal(this);
  }

  r8(addr) {
    assert(typeof addr === 'number', 'invalid address');
    switch (addr >> 12) {
      case 0x0:
      case 0x1:
        return this.nes.cart.r8(addr);
      case 0x2:
      case 0x3:
        if (addr < 0x3f00) {
          return this.vram[(addr >> 10) & 3][addr & 0x3ff];
        } else {
          return this.palette[addr & 0x1f];
        }
      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }

  w8(val, addr) {
    assert(typeof val === 'number', 'invalid value');
    assert(typeof addr === 'number', 'invalid address');
    switch (addr >> 12) {
      case 0x0:
      case 0x1: {
        const table = (addr >> 12) & 1;
        this.nes.video.updatePattern(table, val, addr);
        this.nes.cart.w8(val, addr);
        return;
      }
      case 0x2:
      case 0x3: {
        if (addr < 0x3f00) {
          const index = (addr >> 10) & 3;
          if ((addr & 0x3ff) < 0x3c0) {
            const tilemap = this.nes.video.tilemap[index];
            tilemap[(addr >> 5) & 0x1f][addr & 0x1f] = val;
          } else {
            const attribute = this.nes.video.attribute[index];
            const bits = attribute[(addr >> 3) & 7][addr & 7];
            for (let i = 0; i < bits.length; i++) {
              bits[i] = (val >> (i << 1)) & 3;
            }
          }
          this.vram[index][addr & 0x3ff] = val;
        } else {
          const color = (addr & 3) - 1;
          if (addr == 0x3f00) {
            this.nes.video.bkgPalette = val;
          } else if (color > -1) {
            this.nes.video.palette[(addr >> 2) & 7][color] = val;
          }
          this.palette[addr & 0x1f] = val;
        }
        return;
      }
      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }
}
