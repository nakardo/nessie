export default class Memory {
  cart = null;

  stat = 0;
  latch = 0;

  vram = new Uint8Array(0x800);
  palette = new Uint8Array(0x20);
  addr = 0;

  constructor(cart) {
    this.cart = cart;
  }

  increment() {
    this.addr += (this.stat & 4) === 0 ? 1 : 0x20;
    this.addr &= 0x3fff;
  }

  r8() {
    let val;
    switch (this.addr >> 12) {
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
        val = this.latch;
        break;
    }

    this.increment();
    return val;
  }

  w8(val) {
    switch (this.addr >> 12) {
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
    }

    this.increment();
  }
}
