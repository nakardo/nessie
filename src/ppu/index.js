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
  scroll = [0, 0]; // (x, y)

  scanline = 241;
  cycles = 0;
  resetCycles = 0;
  resetIgnoreWrites = true;
  writeCount = 0;
  latch = 0;
  oamAddr = 0;
  vramAddr = 0;

  renderFrame = false;
  isOddFrame = true;
  sprite0Hit = false;

  constructor(nes) {
    this.nes = nes;
    this.mem = new Memory(nes);
    Object.seal(this);
  }

  reset() {
    this.ctrl = 0;
    this.mask = 0;
    this.stat &= 0x80;
    this.scroll = [0, 0];
    this.cycles = 0;
    this.scanline = 0;
    this.resetCycles = 0;
    this.resetIgnoreWrites = true;
    this.writeCount = 0;
    this.latch = 0;
    this.vramAddr = 0;
    this.renderFrame = false;
    this.isOddFrame = false;
    this.sprite0Hit = false;
  }

  incrementVramAddress() {
    this.vramAddr += (this.ctrl & 4) === 0 ? 1 : 0x20;
    this.vramAddr &= 0x3fff;
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

    if (this.cycles == 1) {
      if (this.scanline == 241) {
        this.nes.cpu.nmi = (this.ctrl & 0x80) > 0;
        this.stat |= 0x80; // vblank
      } else if (this.scanline == 261) {
        this.stat &= ~0xe0;
      }
    } else if (
      this.cycles == 339 &&
      this.scanline == 261 &&
      this.isOddFrame &&
      this.mask & 0x18
    ) {
      this.cycles++;
    }

    if (this.cycles == 340) {
      this.renderScanline();
      this.isOddFrame = !this.isOddFrame;
      this.cycles = -1;
    }
    this.cycles++;
  }

  renderScanline() {
    if (this.scanline < 240) {
      // NOTE(nakardo): reporting sprite 0 hit delayed by one line seems
      // to make it work.
      // See: https://forums.nesdev.org/viewtopic.php?t=15890
      if (this.sprite0Hit) {
        this.stat |= 0x40;
        this.sprite0Hit = false;
      }
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
        this.writeCount = 0;
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
        this.latch = this.mem.r8(this.vramAddr);
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

  w8(val, addr) {
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
        // Horizontal offsets range from 0 to 255. "Normal" vertical offsets
        // range from 0 to 239, while values of 240 to 255 are treated as -16
        // through -1 in a way, but tile data is incorrectly fetched from the
        // attribute table.
        this.scroll[this.writeCount++] = val;
        this.writeCount &= 1;
        return;
      case PPU.PPUADDR:
        if (this.writeCount === 0) {
          this.vramAddr = val << 8;
        } else {
          this.vramAddr |= val;
        }
        this.vramAddr &= 0x3fff;
        this.writeCount++;
        this.writeCount &= 1;
        return;
      case PPU.PPUDATA:
        this.mem.w8(val, this.vramAddr);
        this.incrementVramAddress();
        return;
      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }
}
