import {UnmappedAddressError} from '../../errors';

export default class NROM {
  prgRom = null;
  prgRam = null;
  prgRomLastPage = 0;

  constructor({prgRom, prgRam}) {
    this.prgRom = prgRom;
    this.prgRam = prgRam;
    this.prgRomLastPage = prgRom.length - 1;
  }

  w8({val, addr}) {
    if (addr >= 0x6000 && addr < 0x8000) {
      this.prgRam[addr & 0x1fff] = val;
      return;
    }

    throw new UnmappedAddressError(addr);
  }

  r8(addr) {
    if (addr < 0x6000) {
      throw new UnmappedAddressError(addr);
    } else if (addr < 0x8000) {
      return this.prgRam[addr & 0x1fff];
    } else if (addr < 0xc000) {
      return this.prgRom[0][addr & 0x3fff];
    } else {
      return this.prgRom[this.prgRomLastPage][addr & 0x3fff];
    }
  }
}
