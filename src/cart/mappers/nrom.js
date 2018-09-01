import {UnmappedAddressError} from '../../errors';

export default class NROM {
  romBank0 = 0;
  romBank1 = 0;

  constructor(cart) {
    this.cart = cart;
    this.romBank0 = 0;
    this.romBank1 = this.cart.rom.length - 1;
  }

  r8(addr) {
    switch (addr >> 12) {
      case 0x6:
      case 0x7:
        return this.cart.ram[addr & 0x1fff];
      case 0x8:
      case 0x9:
      case 0xa:
      case 0xb:
        return this.cart.rom[this.romBank0][addr & 0x3fff];
      case 0xc:
      case 0xd:
      case 0xe:
      case 0xf:
        return this.cart.rom[this.romBank1][addr & 0x3fff];
      default:
        break;
    }
    throw new UnmappedAddressError(addr);
  }

  w8({val, addr}) {
    switch (addr >> 12) {
      case 0x6:
      case 0x7:
        this.cart.ram[addr & 0x1fff] = val;
        return;
      default:
        break;
    }
    throw new UnmappedAddressError(addr);
  }
}
