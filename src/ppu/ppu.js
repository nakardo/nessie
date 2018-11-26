import {debug as Debug} from 'debug';
import {UnmappedAddressError} from '../errors';
import * as PPU from './registers';

const debug = Debug('nes:ppu');

const SCANLINES_PER_FRAME = 262;
const SCANLINE_CLOCK_CYCLES = 314;
const PPUCTRL_IGNORE_WRITES_CYCLES = 30000;

export default class Ppu {
  cart = null;
  cpu = null;

  // Registers

  ctrl = 0;
  mask = 0;
  stat = 0;
  oamAddr = 0;
  scroll = [0, 0]; // (x, y)
  ppuAddr = 0;

  t = 0;
  scanline = 0;
  resetCycles = 0;
  writeCount = 0;
  reset = true;
  latch = 0;

  // Memory

  oam = new Uint8Array(0x100);
  vram = new Uint8Array(0x4000);

  constructor(cart) {
    this.cart = cart;
  }

  // 8 kbytes rom or ram on cart + mappers
  // 2 kbytes ram in the console

  // 2 address spaces palette (internal ppu)
  // oam for sprites (internal ppu)

  // vblank

  step(cycles) {
    this.t += cycles;

    // After power/reset, writes to this register are ignored for about
    // 30,000 cycles.
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

    // OAMADDR is set to 0 during each of ticks 257-320 (the sprite tile
    // loading interval) of the pre-render and visible scanlines.
    if (this.scanline >= 257 && this.scanline <= 320) {
      this.oamAddr = 0;
    }
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
        this.latch = this.oam[this.oamAddr];
        break;
      case PPU.PPUDATA:
        this.latch = this.vram[this.ppuAddr];
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
      case PPU.PPUMASK:
        this.mask = val;
        return;
      case PPU.OAMADDR:
        this.oamAddr = val;
        return;
      case PPU.OAMDATA:
        this.oam[this.oamAddr++] = val;
        this.oamAddr &= 0xff;
        return;
      case PPU.PPUSCROLL:
        // Horizontal offsets range from 0 to 255. "Normal" vertical offsets
        // range from 0 to 239, while values of 240 to 255 are treated as -16
        // through -1 in a way, but tile data is incorrectly fetched from the
        // attribute table.
        this.scroll[this.writeCount++] = val;
        this.writeCount &= 1;
        return;
      case PPU.PPUADDR: {
        const offset = ~this.writeCount << 2;
        this.ppuAddr &= ~(0xf << offset);
        this.ppuAddr |= val << offset;
        this.ppuAddr &= 0x3fff;
        this.writeCount++;
        this.writeCount &= 1;
        return;
      }
      case PPU.PPUDATA:
        this.vram[this.ppuAddr] = val;
        return;
      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }
}
