import assert from 'assert';
import {debug as Debug} from 'debug';
import MAPPERS from './mappers';

const debug = Debug('nes:cart');

const PRG_ROM_PAGE_SIZE = 0x4000;
const CHR_ROM_PAGE_SIZE = 0x2000;

export default class Cart {
  prgRom = null;
  chrRom = null;
  prgRam = new Uint8Array(0x2000);
  mapper = null;
  loaded = false;

  static createMemory({data, pages, size}) {
    return new Array(pages).fill(null).map((_, i) => {
      const offset = i * size;
      const pageData = new Uint8Array(size);
      pageData.set(data.slice(offset, offset + size));
      return pageData;
    });
  }

  load(data) {
    const prgRomPagesCount = data[4];
    const chrRomPagesCount = data[5];

    const mapper = (data[6] >> 4) | (data[7] & 0xf0);
    const Mapper = MAPPERS[mapper];

    // Header data

    debug('mapper index: %d, uses: %s', mapper, Mapper.name);
    debug('prg-rom pages: %d', prgRomPagesCount);
    debug('chr-rom pages: %d', chrRomPagesCount);
    debug('rom control byte #1: %s', data[6].to(2));
    debug('rom control byte #2: %s', data[7].to(2));

    this.prgRom = Cart.createMemory({
      data: data.slice(16),
      pages: prgRomPagesCount,
      size: PRG_ROM_PAGE_SIZE,
    });

    this.chrRom = Cart.createMemory({
      data: data.slice(16 + PRG_ROM_PAGE_SIZE * prgRomPagesCount),
      // TODO(nakardo): check number of pages corresponds to ines format, and
      // default to correct pages / ram when is zero.
      pages: chrRomPagesCount || 2,
      size: CHR_ROM_PAGE_SIZE,
    });

    this.mapper = new Mapper(this);
    this.loaded = true;
  }

  r8(addr) {
    assert(this.loaded, 'cart not loaded');
    return this.mapper.r8(addr);
  }

  w8({val, addr}) {
    assert(this.loaded, 'cart not loaded');
    return this.mapper.w8({val, addr});
  }
}
