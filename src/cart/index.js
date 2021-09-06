import assert from 'assert';
import {debug as Debug} from 'debug';
import MAPPERS from './mappers';

const debug = Debug('nes:cart');

export default class Cart {
  nes = null;
  prgRam = new Uint8Array(0x2000);
  prgRom = null;
  chrRxm = null;
  mapper = null;
  mirroring = 0;
  loaded = false;

  constructor(nes) {
    Object.seal(this);
    this.nes = nes;
  }

  static createMemory({data, pages, size}) {
    return new Array(pages).fill(null).map((_, i) => {
      const offset = i * size;
      const pageData = new Uint8Array(size);
      pageData.set(data.slice(offset, offset + size));
      return pageData;
    });
  }

  static isInesFormat1(data) {
    const ines2 = ((data[7] >> 2) & 3) === 2;
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
    assert((data[6] & 4) === 0, 'cart contains trainer data');

    const prgRomPagesCount = data[4];
    const chrRxmPagesCount = data[5];

    const mapper = (data[6] >> 4) | (data[7] & 0xf0);
    const Mapper = MAPPERS[mapper];

    // Header data (16 bytes)

    debug('mapper index: %d, uses: %s', mapper, Mapper.name);
    debug('prg-rom 16kb size units: %d', prgRomPagesCount);
    debug('chr-rxm 8kb size units: %d', chrRxmPagesCount);
    debug('mirroring: %d', data[6] & 1);
    debug('rom control byte #1: %s', data[6].to(2));
    debug('rom control byte #2: %s', data[7].to(2));

    // Cart memory & mapper

    this.prgRom = Cart.createMemory({
      data: data.slice(0x10),
      pages: prgRomPagesCount,
      size: 0x4000,
    });

    let chrRxmData = new Array(0x2000);
    if (chrRxmPagesCount > 0) {
      chrRxmData = data.slice(0x10 + 0x4000 * prgRomPagesCount);
    }
    this.chrRxm = Cart.createMemory({
      data: chrRxmData, // 0 means the board uses chr-ram.
      pages: (chrRxmPagesCount || 1) << 1, // shift count to have 4kb banks.
      size: 0x1000,
    });
    this.chrRxm.forEach((chrRxm, table) => {
      chrRxm.forEach((val, addr) =>
        this.nes.video.updatePattern(table, val, addr),
      );
    });

    this.mapper = new Mapper({
      prgRom: this.prgRom,
      prgRam: this.prgRam,
      chrRxm: this.chrRxm,
    });
    this.mirroring = data[6] & 1;
    this.loaded = true;
  }

  r8(addr) {
    assert(this.loaded, 'cart not loaded');
    return this.mapper.r8(addr);
  }

  w8(val, addr) {
    assert(this.loaded, 'cart not loaded');
    return this.mapper.w8(val, addr);
  }
}
