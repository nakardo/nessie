import {debug as Debug} from 'debug';
import MAPPERS from './mappers/mappers';

const debug = Debug('nes:cart');

export default class Cart {
  ram = new Uint8Array(0x2000); // SRAM
  rom = null; // PRG-ROM
  mapper = null;

  static createMemory({data, pages, size}) {
    return new Array(pages).fill(null).map((_, i) => {
      const offset = i * size;
      return data.slice(offset, offset + size);
    });
  }

  constructor(data) {
    const romPagesCount = data[4];
    const mapper = (data[6] >> 4) | (data[7] & 0xf0);
    const Mapper = MAPPERS[mapper];

    // Header data

    debug('mapper index: %d, uses: %s', mapper, Mapper.name);
    debug('prg-rom pages: %d', romPagesCount);
    debug('chr-rom pages: %d', data[5]);
    debug('rom control byte #1: %s', data[6].to(2));
    debug('rom control byte #2: %s', data[7].to(2));

    this.rom = Cart.createMemory({
      data: data.slice(16), // Cart data without headers.
      pages: romPagesCount,
      size: 0x4000,
    });
    this.mapper = new Mapper({rom: this.rom, ram: this.ram});

    // TODO(nakardo): pull CHR-ROM data here.
  }

  r8(addr) {
    return this.mapper.r8(addr);
  }

  w8({val, addr}) {
    return this.mapper.w8({val, addr});
  }
}
