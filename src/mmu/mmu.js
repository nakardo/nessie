import {debug as Debug} from 'debug';
import {UnmappedAddressError} from '../errors';
import Ppu from '../ppu/ppu';

const debug = Debug('nes:mmu');

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
 * | $4020   | $1FDF |       | Expansion ROM         |
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
  exrom = new Uint8Array(0x1fdf);
  sram = new Uint8Array(0x2000);
  prgrom = null;

  loadCart(buf) {
    const data = Uint8Array.from(buf);
    this.prgrom = data.slice(16, 0x4000 + 16);

    debug('16K PRG-ROM page count: %d', data[4]);
  }

  r8(addr) {
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
      case 0xc: case 0xd:
      case 0xe: case 0xf:
        return this.prgrom[addr & 0x3fff];
      default: break;
    }
    throw new UnmappedAddressError(addr);
  }

  w8(val, addr) {
    addr &= 0xffff;
    switch (addr >> 12) {
      case 0x0: case 0x1:
        this.ram[addr & 0x7ff] = val;
        return;
      case 0x2: case 0x3:
        this.ppu.w8(val, addr);
        return;
      case 0x4: case 0x5:
        if (addr < 0x20) {
          return;
        }
      case 0x6: case 0x7:
        this.sram[addr & 0x1fff] = val;
        return;
      default: break;
    }
    throw new UnmappedAddressError(addr);
  }

  r16(addr) {
    return this.r8(addr) | this.r8(++addr) << 8;
  }

  w16(val, addr) {
    this.w8(val, addr);
    this.w8(val >> 8, ++addr);
  }
};
