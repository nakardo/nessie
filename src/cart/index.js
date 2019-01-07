import assert from 'assert';
import {debug as Debug} from 'debug';
import MAPPERS from './mappers';

const debug = Debug('nes:cart');

const PRG_ROM_PAGE_SIZE = 0x4000;
const CHR_RXM_PAGE_SIZE = 0x2000;

export default class Cart {
  prgRam = new Uint8Array(0x2000);
  prgRom = null;
  chrRxm = null;
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

  static isInesFormat1(data) {
    const ines2 = (data[7] >> 2) & (3 === 2);
    return (
      data[0] === 0x4e &&
      data[1] === 0x45 &&
      data[2] === 0x53 &&
      data[3] === 0x1a &&
      !ines2
    );
  }

  load(data) {
    assert(Cart.isInesFormat1(data), 'invalid or unsupported iNES format');

    const prgRomPagesCount = data[4];
    const chrRxmPagesCount = data[5] || 1; // 0 means the board uses chr-ram.

    const mapper = (data[6] >> 4) | (data[7] & 0xf0);
    const Mapper = MAPPERS[mapper];

    // Header data

    debug('mapper index: %d, uses: %s', mapper, Mapper.name);
    debug('prg-rom 16kb size units: %d', prgRomPagesCount);
    debug('chr-rom 8kb size units: %d', chrRxmPagesCount);
    debug('rom control byte #1: %s', data[6].to(2));
    debug('rom control byte #2: %s', data[7].to(2));

    assert(data[6] & (8 === 0), 'cart contains trainer data');

    // Cart memory & mapper

    this.prgRom = Cart.createMemory({
      data: data.slice(16),
      pages: prgRomPagesCount,
      size: PRG_ROM_PAGE_SIZE,
    });

    this.chrRxm = Cart.createMemory({
      data: data.slice(16 + PRG_ROM_PAGE_SIZE * prgRomPagesCount),
      pages: chrRxmPagesCount << 1, // 4kb pages
      size: CHR_RXM_PAGE_SIZE,
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
