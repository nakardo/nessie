import {UnmappedAddressError} from '../errors';

export default class Memory {
  cart = null;
  ppu = null;

  vram = new Uint8Array(0x800);
  palette = new Uint8Array(0x20);
  addr = 0;

  constructor(cart, ppu) {
    this.cart = cart;
    this.ppu = ppu;
  }

  increment() {
    this.addr += (this.ppu.stat & 4) === 0 ? 1 : 0x20;
    this.addr &= 0x3fff;
  }

  r8() {
    let val;
    switch (this.addr >> 12) {
      case 0x0:
      case 0x1:
        val = this.cart.r8(this.addr);
        break;
      case 0x2:
      case 0x3:
        if (this.addr < 0x3f00) {
          val = this.vram[this.addr & 0x7ff];
        } else {
          val = this.palette[this.addr & 0x1f];
        }
        break;
      default:
        throw new UnmappedAddressError(this.addr);
    }

    this.increment();
    return val;
  }

  w8(val) {
    switch (this.addr >> 12) {
      case 0x0:
      case 0x1:
        this.cart.w8({val, addr: this.addr});
        break;
      case 0x2:
      case 0x3:
        if (this.addr < 0x3f00) {
          this.vram[this.addr & 0x7ff] = val;
        } else {
          this.palette[this.addr & 0x1f] = val;
        }
        break;
      default:
        throw new UnmappedAddressError(this.addr);
    }

    this.increment();
  }
}
