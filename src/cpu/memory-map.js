import assert from 'assert';
import {debug as Debug} from 'debug';
import {UnmappedAddressError} from '../errors';

const debug = Debug('nes:cpu:memory-map');
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
export default class MemoryMap {
  cart = null;
  ppu = null;
  ram = new Uint8Array(0x800);
  apu = new Uint8Array(0x18);

  constructor(cart, ppu) {
    this.cart = cart;
    this.ppu = ppu;
  }

  r8(addr) {
    assert(typeof addr === 'number', 'invalid address');
    addr &= 0xffff;

    switch (addr >> 12) {
      case 0x0:
      case 0x1:
        return this.ram[addr & 0x7ff];
      case 0x2:
      case 0x3:
        return this.ppu.r8(addr);
      default:
        if (addr < 0x4018) {
          return this.apu[addr & 0x1f];
        } else if (addr < 0x4020) {
          return 0;
        }
        return this.cart.r8(addr);
    }

    // eslint-disable-next-line no-unreachable
    throw new UnmappedAddressError(addr);
  }

  w8({val, addr}) {
    assert(typeof val === 'number', 'invalid value');
    assert(typeof addr === 'number', 'invalid address');
    addr &= 0xffff;

    debug('write at: %s, val: %s', addr.to(16, 2), val.to(16));

    switch (addr >> 12) {
      case 0x0:
      case 0x1:
        this.ram[addr & 0x7ff] = val;
        return;
      case 0x2:
      case 0x3:
        this.ppu.w8({val, addr});
        return;
      default:
        if (addr < 0x4018) {
          this.apu[addr & 0x1f] = val;
          return;
        } else if (addr < 0x4020) {
          return;
        } else if (addr < 0x6004) {
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

    // eslint-disable-next-line no-unreachable
    throw new UnmappedAddressError(addr);
  }

  r16(addr) {
    return this.r8(addr) | (this.r8(++addr) << 8);
  }
}
