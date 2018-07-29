import assert from 'assert';
import {debug as Debug} from 'debug';
import {UnmappedAddressError} from '../errors';
import Ppu from '../ppu/ppu';

const debug = Debug('nes:mmu');

function createMemory({data, pages, size}) {
  return new Array(pages).fill(null).map((_, i) => {
    const offset = i * size;
    return data.slice(offset, offset + size);
  });
}

/**
 * Memory Map
 * ----------
 * +---------+-------+-------+-----------------------+
 * | Address | Size  | Flags | Description           |
 * +---------+-------+-------+-----------------------+
 * | $0000   | $800  |       | RAM                   |
 * | $0800   | $800  | M     | RAM                   |
 * | $1000   | $800  | M     | RAM                   |
 * | $1800   | $800  | M     | RAM                   |
 * | $2000   | 8     |       | Registers             |
 * | $2008   | $1FF8 |  R    | Registers             |
 * | $4000   | $20   |       | Registers             |
 * | $4020   | $1FE0 |       | Expansion ROM         |
 * | $6000   | $2000 |       | SRAM                  |
 * | $8000   | $4000 |       | PRG-ROM               |
 * | $C000   | $4000 |       | PRG-ROM               |
 * +---------+-------+-------+-----------------------+
 *        Flag Legend: M = Mirror of $0000
 *                     R = Mirror of $2000-2008 every 8 bytes
 *                         (e.g. $2008=$2000, $2018=$2000, etc.)
 */
export default class Mmu {
  ram = new Uint8Array(0x800);
  ppu = new Ppu();
  exrom = new Uint8Array(0x1fe0);
  sram = new Uint8Array(0x2000);
  prgrom = null;

  loadCart(cart) {
    const prgRomPageCount = cart[4];
    debug('16K PRG-ROM page count: %d', prgRomPageCount);
    debug('8K CHR-ROM page count: %d', cart[5]);
    debug('ROM Control Byte #1: %s', cart[6].to(2));
    debug('ROM Control Byte #2: %s', cart[7].to(2));
    debug('Mapper #: %d', ((cart[6] >> 4) | cart[7] & 0xf0));

    const data = cart.slice(16);
    this.prgrom = createMemory({data, pages: prgRomPageCount, size: 0x4000});

    // TODO(nakardo): pull CHR-ROM data here.
  }

  r8(addr) {
    assert.ok(typeof addr === 'number', 'invalid address');

    addr &= 0xffff;
    switch (addr >> 12) {
      case 0x0: case 0x1:
        return this.ram[addr & 0x7ff];
      case 0x2: case 0x3:
        return this.ppu.r8(addr);
      case 0x4: case 0x5:
        addr &= 0x1fff;
        if (addr < 0x20) {
          return 0;
        }
        return this.exrom[addr - 0x20];
      case 0x6: case 0x7:
        return this.sram[addr & 0x1fff];
      case 0x8: case 0x9:
      case 0xa: case 0xb:
        return this.prgrom[0][addr & 0x3fff];
      case 0xc: case 0xd:
      case 0xe: case 0xf:
        return this.prgrom[1][addr & 0x3fff];
      default: break;
    }
    throw new UnmappedAddressError(addr);
  }

  w8({val, addr}) {
    assert.ok(typeof val === 'number', 'invalid value');
    assert.ok(typeof addr === 'number', 'invalid address');

    debug('write at: %s, val: %s', addr.to(16, 2), val.to(16));

    addr &= 0xffff;
    switch (addr >> 12) {
      case 0x0: case 0x1:
        this.ram[addr & 0x7ff] = val;
        return;
      case 0x2: case 0x3:
        this.ppu.w8({val, addr});
        return;
      case 0x4: case 0x5:
        if (addr < 0x20) {
          return;
        }
        return;
      case 0x6: case 0x7:
        if (addr < 0x6004) {
          console.log(addr.to(16), val.to(16));
          if (addr == 0x6000 && val != 0x80 && val > 0) process.exit(1);
        } else {
          process.stdout.write(String.fromCharCode(val));
        }
        this.sram[addr & 0x1fff] = val;
        return;
      case 0xe:
        return 0;
      default: break;
    }
    // throw new UnmappedAddressError(addr);
  }

  r16(addr) {
    return this.r8(addr) | this.r8(++addr) << 8;
  }
};
