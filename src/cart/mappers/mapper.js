import {UnmappedAddressError} from '../../errors';

export default class Mapper {
  prgRom = null;
  chrRxm = null;
  prgRam = null;
  prgRamEnable = false;
  chrRxmBank = [0, 0];
  prgRomBank = [0, 0];
  prgRomLastPage = 0;

  constructor({prgRom, chrRxm, prgRam}) {
    this.prgRom = prgRom;
    this.chrRxm = chrRxm;
    this.prgRam = prgRam;

    this.prgRomBank[1] = this.prgRomLastPage = prgRom.length - 1;
  }

  w8({val, addr}) {
    switch (addr >> 12) {
      case 0x4:
      case 0x5:
        return;
      case 0x6:
      case 0x7:
        if (this.prgRamEnable) {
          this.prgRam[addr & 0x1fff] = val;
        }
        return;
      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }

  r8(addr) {
    switch (addr >> 12) {
      case 0x4:
      case 0x5:
        return 0xff;
      case 0x6:
      case 0x7:
        if (!this.prgRamEnable) {
          return 0xff;
        }
        return this.prgRam[addr & 0x1fff];
      case 0x8:
      case 0x9:
      case 0xa:
      case 0xb: {
        const bank = this.prgRomBank[0];
        return this.prgRom[bank][addr & 0x3fff];
      }
      case 0xc:
      case 0xd:
      case 0xe:
      case 0xf: {
        const bank = this.prgRomBank[1];
        return this.prgRom[bank][addr & 0x3fff];
      }
      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }
}
