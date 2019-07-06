import {debug as Debug} from 'debug';
import {UnmappedAddressError} from '../errors';
import * as PPU from './registers';
import Memory from './memory';
import Oam from './oam';

const debug = Debug('nes:ppu');

const SCANLINES_PER_FRAME = 262;
const SCANLINE_CLOCK_CYCLES = 341;
const REG_WRITE_IGNORE_WRITES_CYCLES = 29658;
const REG_WRITE_IGNORE = PPU.PPUCTRL | PPU.PPUMASK | PPU.PPUSCROLL;

export default class Ppu {
  cpu = null;
  mem = null;
  screen = null;
  oam = new Oam();

  // Registers

  ctrl = 0;
  mask = 0;
  stat = 0;
  scroll = [0, 0]; // (x, y)

  t = 0;
  scanline = 0;
  resetCycles = 0;
  writeCount = 0;
  reset = true;
  latch = 0;

  constructor(cart, screen) {
    this.mem = new Memory(cart, this);
    this.screen = screen;
  }

  step(cycles) {
    this.t += cycles;

    // After power/reset, writes to this register are ignored for about
    // 30,000 cycles.
    if (this.reset) {
      this.resetCycles += cycles;
      if (this.resetCycles > REG_WRITE_IGNORE_WRITES_CYCLES) {
        this.resetCycles = 0;
        this.reset = false;
      }
    }

    if (this.t < SCANLINE_CLOCK_CYCLES) {
      return;
    }

    if (this.scanline < 240) {
      this.stat &= ~0x80;
      this.screen.drawLine(this.scanline);
    } else if (this.scanline === 241) {
      this.stat |= 0x80;
      if (this.ctrl & 0x80) {
        this.cpu.nmi = true;
      }
    }

    this.scanline += 1;
    if (this.scanline > SCANLINES_PER_FRAME) {
      this.scanline = 0;
    }
    this.t = 0;
  }

  r8(addr) {
    debug('read at: %s', addr.to(16, 2));

    switch (0x2000 | (addr & 0x7)) {
      case PPU.PPUSTATUS:
        // Reading the status register will clear bit 7 mentioned above and
        // also the address latch used by PPUSCROLL and PPUADDR. It does not
        // clear the sprite 0 hit or overflow bit.
        this.stat &= ~(1 << 7);
        this.latch = this.stat;
        break;
      case PPU.OAMDATA:
        // TODO: Writes will increment OAMADDR after the write; reads during
        // vertical or forced blanking return the value from OAM at that
        // address but do not increment.
        this.latch = this.oam.r8();
        break;
      case PPU.PPUDATA:
        this.latch = this.mem.r8();
        break;
      case PPU.PPUCTRL:
      case PPU.PPUMASK:
      case PPU.OAMADDR:
      case PPU.PPUSCROLL:
      case PPU.PPUADDR:
      default:
        break;
    }

    return this.latch;
  }

  w8({val, addr}) {
    val &= 0xff;
    debug('write at: %s, val: %s', addr.to(16, 2), val.to(16));
    this.latch = val;

    const reg = 0x2000 | (addr & 0x7);
    if (this.reset && reg & REG_WRITE_IGNORE) {
      debug('writing to: %s while writes ignored', reg.to(16, 2));
      return;
    }

    switch (reg) {
      case PPU.PPUCTRL:
        this.ctrl = val;
        return;
      case PPU.PPUMASK:
        this.mask = val;
        return;
      case PPU.OAMADDR:
        this.oam.addr = val;
        return;
      case PPU.OAMDATA:
        this.oam.w8(val);
        return;
      case PPU.PPUSCROLL:
        // Horizontal offsets range from 0 to 255. "Normal" vertical offsets
        // range from 0 to 239, while values of 240 to 255 are treated as -16
        // through -1 in a way, but tile data is incorrectly fetched from the
        // attribute table.
        this.scroll[this.writeCount++] = val;
        this.writeCount &= 1;
        return;
      case PPU.PPUADDR:
        if (this.writeCount === 0) {
          this.mem.addr &= ~0xf0;
          this.mem.addr |= val << 4;
        } else {
          this.mem.addr &= ~0xf;
          this.mem.addr |= val;
        }
        this.mem.addr &= 0x3fff;
        this.writeCount++;
        this.writeCount &= 1;
        return;
      case PPU.PPUDATA:
        this.mem.w8(val);
        return;
      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }
}
