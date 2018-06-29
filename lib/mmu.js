'use strict';

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
  constructor() {
    this.ram = new Uint8Array(0x800);
    this.exrom = new Uint8Array(0x1fdf);
    this.sram = new Uint8Array(0x2000);
    this.prgrom = null;
  }

  loadCart(data) {
    this.prgrom = Uint8Array.from(data.slice(16, 0x4000 + 16));
  }

  r8(addr) {
    addr &= 0xffff;
    switch (addr >> 12) {
      case 0x0: case 0x1:
        return this.ram[addr & 0x7ff];
      case 0x2: case 0x3:
        return 0;
      case 0x4: case 0x5:
        addr &= 0x1fff;
        if (addr < 0x20) {
          return 0;
        }
        return this.exrom[addr - 0x20];
      case 0x6: case 0x7:
        return this.sram[addr & 0x4fff];
      case 0x8: case 0x9:
      case 0xa: case 0xb:
      case 0xc: case 0xd:
      case 0xe: case 0xf:
        return this.prgrom[addr & 0x3fff];
      default: break;
    }
    throw new Error(`Invalid address: 0x${addr.toString(16)}`);
  }

  w8(val, addr) {
    addr &= 0xffff;
    switch (addr >> 12) {
      case 0x0: case 0x1:
        return this.ram[addr & 0x7ff] = val;
      case 0x2: case 0x3:
        return 0;
      case 0x4: case 0x5:
        if (addr < 0x20) {
          return 0;
        }
      case 0x6: case 0x7:
        return this.sram[addr & 0x4fff];
      default: break;
    }
    throw new Error(`Invalid address: 0x${addr.toString(16)}`);
  }

  r16(addr) {
    return this.r8(addr) | this.r8(++addr) << 8;
  }

  w16(val, addr) {
    this.w8(addr, val);
    this.w8(++addr, val >> 8);
  }
};
