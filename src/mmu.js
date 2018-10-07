import assert from 'assert';
import {debug as Debug} from 'debug';
import {UnmappedAddressError} from './errors';
import Ppu from './ppu/ppu';

const debug = Debug('nes:mmu');
const test = Debug('nes:test');

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
  cart = null;
  ram = new Uint8Array(0x800);
  ppu = new Ppu();
  exrom = new Uint8Array(0x1fe0);

  r8(addr) {
    assert.ok(typeof addr === 'number', 'invalid address');
    addr &= 0xffff;

    if (addr < 0x2000) {
      return this.ram[addr & 0x7ff];
    } else if (addr < 0x4000) {
      return this.ppu.r8(addr);
    } else if (addr < 0x6000) {
      addr &= 0x1fff;
      if (addr < 0x20) {
        return 0;
      }
      return this.exrom[addr - 0x20];
    } else {
      return this.cart.r8(addr);
    }
  }

  w8({val, addr}) {
    assert.ok(typeof val === 'number', 'invalid value');
    assert.ok(typeof addr === 'number', 'invalid address');
    addr &= 0xffff;

    debug('write at: %s, val: %s', addr.to(16, 2), val.to(16));

    if (addr < 0x2000) {
      this.ram[addr & 0x7ff] = val;
      return;
    } else if (addr < 0x4000) {
      this.ppu.w8({val, addr});
      return;
    } else if (addr < 0x6000) {
      addr &= 0x1fff;
      // TODO(nakardo): update registers here?
      if (addr < 0x20) {
        return;
      }
    } else {
      if (addr < 0x6004) {
        test('%s: %s', addr.to(16), val.to(16));
        if (addr == 0x6000 && val != 0x80 && val > 0) {
          test('invalid result code: %s', val.to(16));
          process.exit(1);
        }
      } else if (addr < 0x8000) {
        process.stdout.write(String.fromCharCode(val));
      }
      this.cart.w8({val, addr});
      return;
    }

    throw new UnmappedAddressError(addr);
  }

  r16(addr) {
    return this.r8(addr) | (this.r8(++addr) << 8);
  }
}
