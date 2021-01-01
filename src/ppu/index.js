import {debug as Debug} from 'debug';
import {UnmappedAddressError} from '../errors';
import * as PPU from './registers';
import Memory from './memory';

const debug = Debug('nes:ppu');

const REG_WRITE_IGNORE_WRITES_CYCLES = 29780;
const REG_WRITE_IGNORE = PPU.PPUCTRL | PPU.PPUMASK | PPU.PPUSCROLL;

export default class Ppu {
  nes = null;
  mem = null;
  oam = new Uint8Array(0x100);

  // Registers

  ctrl = 0;
  mask = 0;
  stat = 0;

  /**
   * PPU Scrolling
   *
   * The PPU uses the current VRAM address for both reading and writing PPU
   * memory thru $2007, and for fetching nametable data to draw the background.
   * As it's drawing the background, it updates the address to point to the
   * nametable data currently being drawn. Bits 10-11 hold the base address of
   * the nametable minus $2000. Bits 12-14 are the Y offset of a scanline
   * within a tile.
   *
   * The 15 bit registers t and v are composed this way during rendering:
   *
   * yyy NN YYYYY XXXXX
   * ||| || ||||| +++++-- coarse X scroll
   * ||| || +++++-------- coarse Y scroll
   * ||| ++-------------- nametable select
   * +++----------------- fine Y scroll
   */
  v = 0; // Current VRAM address (15 bits)
  t = 0; // Temporary VRAM address (15 bits); can also be thought of as the
  // address of the top left onscreen tile.
  x = 0; // Fine X scroll (3 bits)
  w = 0; // First or second write toggle (1 bit)

  scanline = 241;
  cycles = 0;
  resetCycles = 0;
  resetIgnoreWrites = true;
  latch = 0;
  oamAddr = 0;

  renderFrame = false;
  isOddFrame = true;

  constructor(nes) {
    this.nes = nes;
    this.mem = new Memory(nes);
    Object.seal(this);
  }

  reset() {
    this.ctrl = 0;
    this.mask = 0;
    this.stat &= 0x80;
    this.v = 0;
    this.t = 0;
    this.x = 0;
    this.w = 0;
    this.cycles = 0;
    this.scanline = 0;
    this.resetCycles = 0;
    this.resetIgnoreWrites = true;
    this.latch = 0;
    this.renderFrame = false;
    this.isOddFrame = false;
  }

  incrementVramAddress() {
    this.v += (this.ctrl & 4) === 0 ? 1 : 0x20;
    this.v &= 0x3fff;
  }

  incrementY() {
    if ((this.v & 0x7000) != 0x7000) {
      this.v += 0x1000; // increment fine Y
    } else {
      this.v &= ~0x7000; // fine Y = 0
      let y = (this.v & 0x03e0) >> 5; // let y = coarse Y
      if (y == 29) {
        y = 0; // coarse Y = 0
        this.v ^= 0x0800; // switch vertical nametable
      } else if (y == 31) {
        y = 0; // coarse Y = 0, nametable not switched
      } else {
        y += 1; // increment coarse Y
        this.v = (this.v & ~0x03e0) | (y << 5); // put coarse Y back into v
      }
    }
  }

  copyX() {
    this.v = (this.v & 0xfbe0) | (this.t & 0x41f);
  }

  copyY() {
    this.v
  }

  step() {
    // After power/reset, writes to this register are ignored for about
    // 30,000 cycles.
    if (this.resetIgnoreWrites) {
      this.resetCycles++;
      if (this.resetCycles > REG_WRITE_IGNORE_WRITES_CYCLES) {
        this.resetCycles = 0;
        this.resetIgnoreWrites = false;
      }
    }

    if (this.mask & 0x18) { // rendering enabled.
      if (this.cycles == 256) {
        this.incrementY();
      } else if (this.cycles == 257) {
        this.copyX();
      } else if (this.scanline == 261) {
        if (this.cycles >= 280 && this.cycles <= 304) {
          this.copyY();
        } else if (this.cycles == 339 && this.isOddFrame) {
          this.cycles++;
        }
      }
    }

    if (this.cycles == 1) {
      if (this.scanline == 241) {
        this.nes.cpu.nmi = (this.ctrl & 0x80) > 0;
        this.stat |= 0x80; // vblank
      } else if (this.scanline == 261) {
        this.stat &= ~0xe0;
      }
    } else if (this.cycles == 340) {
      this.renderScanline();
      this.isOddFrame = !this.isOddFrame;
      this.cycles = -1;
    }
    this.cycles++;
  }

  renderScanline() {
    if (this.scanline < 240) {
      this.nes.video.drawLine();
    } else if (this.scanline == 261) {
      this.renderFrame = true;
      this.scanline = -1;
    }

    this.scanline++;
  }

  r8(addr) {
    debug('read at: %s', addr.to(16, 2));

    switch (0x2000 | (addr & 0x7)) {
      case PPU.PPUSTATUS: {
        // Reading the status register will clear bit 7 mentioned above and
        // also the address latch used by PPUSCROLL and PPUADDR. It does not
        // clear the sprite 0 hit or overflow bit.
        const stat = this.stat;
        this.stat &= ~0x80;
        // w:                  = 0
        this.w = 0;
        this.latch = (stat & 0xe0) | (this.latch & 0x1f);
        break;
      }
      case PPU.OAMDATA:
        // TODO: Writes will increment OAMADDR after the write; reads during
        // vertical or forced blanking return the value from OAM at that
        // address but do not increment.
        this.latch = this.oam[this.oamAddr];
        break;
      case PPU.PPUDATA:
        this.latch = this.mem.r8({addr: this.v});
        this.incrementVramAddress();
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
    const reg = addr & 0xf007;
    if (this.resetIgnoreWrites && reg & REG_WRITE_IGNORE) {
      debug('write at: %s ignored', reg.to(16, 2));
      return;
    }

    val &= 0xff;
    debug('write at: %s, val: %s', addr.to(16, 2), val.to(16));
    this.latch = val;

    if (addr == PPU.OAMDMA) {
      for (let i = 0; i < 0x100; i++) {
        const byte = this.nes.cpu.mem.r8((val << 8) | i);
        this.nes.video.sprites[i >> 2][i & 3] = this.oam[i] = byte;
      }
      this.nes.cpu.haltCycles += 513;
      return;
    }

    switch (reg) {
      case PPU.PPUCTRL:
        // t: ...BA.. ........ = d: ......BA
        this.t = (this.t & 0xf3ff) | ((val & 3) << 10);
        this.ctrl = val;
        return;
      case PPU.PPUMASK:
        this.mask = val;
        return;
      case PPU.OAMADDR:
        this.oamAddr = val;
        return;
      case PPU.OAMDATA: {
        const addr = this.oamAddr++;
        this.nes.video.sprites[addr >> 2][addr & 3] = this.oam[addr] = val;
        this.oamAddr &= 0xff;
        return;
      }
      case PPU.PPUSCROLL:
        if (this.w == 0) {
          // t: ....... ...HGFED = d: HGFED...
          // x:              CBA = d: .....CBA
          // w:                  = 1
          this.t = (this.t & 0xffe0) | ((val & 0xf8) >> 3);
          this.x = val & 6;
        } else {
          // t: CBA..HG FED..... = d: HGFEDCBA
          // w:                  = 0
          this.t &= 0xfc1f;
          this.t |= ((val & 7) << 12) | ((val & 0xf8) << 2);
        }
        this.w ^= 1;
        return;
      case PPU.PPUADDR:
        if (this.w == 0) {
          // t: .FEDCBA ........ = d: ..FEDCBA
          // t: X...... ........ = 0
          // w:                  = 1
          this.t = (this.t & 0x80ff) | (val & 0x3f);
        } else {
          // t: ....... HGFEDCBA = d: HGFEDCBA
          // v                   = t
          // w:                  = 0
          this.t = (this.t & 0xff00) | val;
          this.v = this.t;
        }
        this.w ^= 1;
        return;
      case PPU.PPUDATA:
        this.mem.w8({val, addr: this.v});
        this.incrementVramAddress();
        return;
      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }
}
