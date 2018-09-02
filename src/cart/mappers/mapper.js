import {UnmappedAddressError} from '../../errors';

export default class Mapper {
  prgRom = null;
  chrRom = null;
  prgRam = null;
  chrRomBank = 0;
  prgRomBank0 = 0;
  prgRomBank1 = 0;

  constructor({prgRom, chrRom, prgRam}) {
    this.prgRom = prgRom;
    this.chrRom = chrRom;
    this.prgRam = prgRam;

    this.prgRomLastPage = this.prgRom.length - 1;
    this.prgRomBank1 = this.prgRomLastPage;
  }

  w8({val, addr}) {
    switch (addr >> 12) {
      case 0x6:
      case 0x7:
        this.prgRam[addr & 0x1fff] = val;
        return;
      default:
        break;
    }
    throw new UnmappedAddressError(addr);
  }

  r8(addr) {
    switch (addr >> 12) {
      case 0x6:
      case 0x7:
        return this.prgRam[addr & 0x1fff];
      case 0x8:
      case 0x9:
      case 0xa:
      case 0xb:
        return this.prgRom[this.prgRomBank0][addr & 0x3fff];
      case 0xc:
      case 0xd:
      case 0xe:
      case 0xf:
        return this.prgRom[this.prgRomBank1][addr & 0x3fff];
      default:
        break;
    }
    throw new UnmappedAddressError(addr);
  }
}
