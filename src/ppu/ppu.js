import {debug as Debug} from 'debug';
import {UnmappedAddressError} from '../errors';
import * as PPU from './registers';

const debug = Debug('nes:ppu');

const SCANLINES_PER_FRAME = 262;
const SCANLINE_CLOCK_CYCLES = 314;
const PPUCTRL_IGNORE_WRITES_CYCLES = 30000;

export default class Ppu {
  cpu = null;

  ctrl = 0;
  stat = 0;
  oamData = 0;
  ppuData = 0;

  t = 0;
  scanline = 0;
  resetCycles = 0;
  reset = true;
  latch = 0;

  // 8 kbytes rom or ram on cart + mappers
  // 2 kbytes ram in the console

  // 2 address spaces palette (internal ppu)
  // oam for sprites (internal ppu)

  // vblank

  step(cycles) {
    this.t += cycles * 3;

    if (this.reset) {
      this.resetCycles += cycles;
      if (this.resetCycles > PPUCTRL_IGNORE_WRITES_CYCLES) {
        this.resetCycles = 0;
        this.reset = false;
      }
    }

    if (this.t > SCANLINE_CLOCK_CYCLES) {
      this.t = 0;
      this.scanline += 1;
      if (this.scanline > SCANLINES_PER_FRAME) {
        this.scanline = 0;
      }
    }

    if (this.scanline === 241) {
      // TODO:
      // Vertical blank has started (0: not in vblank; 1: in vblank).
      // Set at dot 1 of line 241 (the line *after* the post-render
      // line); cleared after reading $2002 and at dot 1 of the
      // pre-render line.
      this.stat |= 1 << 7;
    }
  }

  r8(addr) {
    debug('read at: %s', addr.to(16, 2));

    switch (0x2000 | (addr & 0x7)) {
      case PPU.PPUSTATUS:
        return (this.latch = this.stat);
      case PPU.OAMDATA:
        return (this.latch = this.oamData);
      case PPU.PPUDATA:
        return (this.latch = this.ppuData);
      case PPU.PPUCTRL:
      case PPU.PPUMASK:
      case PPU.OAMADDR:
      case PPU.PPUSCROLL:
      case PPU.PPUADDR:
        return this.latch;
      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }

  w8({val, addr}) {
    val &= 0xff;
    debug('write at: %s, val: %s', addr.to(16, 2), val.to(16));
    this.latch = val;

    switch (0x2000 | (addr & 0x7)) {
      case PPU.PPUCTRL:
        if (this.reset) {
          debug('writing ppuctrl while writes ignored');
          return;
        }
        this.ctrl = val;

        // we're in vblank period and generate nmi on vblank is enabled.
        if (this.ctrl & this.stat & 0x80) {
          this.cpu.nmi = true;
        }
        return;
      case PPU.PPUSTATUS:
        // TODO: After power/reset, writes to this register are ignored for
        // about 30,000 cycles.
        break;
      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }
}
