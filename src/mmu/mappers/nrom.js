import {debug as Debug} from 'debug';
import {UnmappedAddressError} from '../../errors';

const debug = Debug('nes:mapper:nrom');

export default class NROM {
  ram = new Uint8Array(0x2000); // PRG-ROM
  rom = null; // SRAM

  constructor(cart) {
    const romPagesCount = cart[4];
    debug('16K PRG-ROM page count: %d', romPagesCount);
    debug('8K CHR-ROM page count: %d', cart[5]);

    const data = cart.slice(16);
    this.rom = this.createMemory({data, pages: romPagesCount, size: 0x4000});
    this.romPagesCount = romPagesCount;

    // TODO(nakardo): pull CHR-ROM data here.
  }

  createMemory({data, pages, size}) {
    return new Array(pages).fill(null).map((_, i) => {
      const offset = i * size;
      return data.slice(offset, offset + size);
    });
  }

  r8(addr) {
    switch (addr >> 12) {
      case 0x6: case 0x7:
        return this.ram[addr & 0x1fff];
      case 0x8: case 0x9:
      case 0xa: case 0xb:
        return this.rom[0][addr & 0x3fff];
      case 0xc: case 0xd:
      case 0xe: case 0xf:
        return this.rom[this.romPagesCount - 1][addr & 0x3fff];
      default: break;
    }
    throw new UnmappedAddressError(addr);
  }

  w8({val, addr}) {
    switch (addr >> 12) {
      case 0x6: case 0x7:
        this.ram[addr & 0x1fff] = val;
        return;
      default: break;
    }
    throw new UnmappedAddressError(addr);
  }
}
