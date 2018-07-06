import {debug as Debug} from 'debug';
import {UnmappedAddressError} from '../errors';
import * as PPU from './registers'

const debug = Debug('nes:ppu');

export default class Ppu {
  ctrl1 = 0;
  ctrl2 = 0;
  stat = 0;
  sprram = new Uint8Array(0x100);
  sprramaddr = 0;
  sprramdata = 0;
  bgoffset = 0;
  vram = new Uint8Array(0x4000);
  vramaddr = 0;
  vramdata = 0;

  /**
   * 1st/2nd Write
   *
   * Below Port 2005h and 2006h require two 8bit writes to receive a 16bit
   * parameter, the current state (1st or 2nd write) is memorized in a single
   * flipflop, which is shared for BOTH Port 2005h and 2006h. The flipflop is
   * reset when reading from PPU Status Register Port 2002h (the next write
   * will be then treated as 1st write) (and of course it is also reset after
   * any 2nd write).
   */
  ffword = 0;

  /**
   * Locked Registers
   *
   * During first frame after Reset, Ports 2000h, 2001h, 2005h, and 2006h are
   * reportedly write-protected. And, Port 2007h is read-protected (always
   * returns 00h, even if all VRAM at 0000h..3FFFh is FFh-filled, and even if
   * the 2007h prefetch latch was pre-loaded with a nonzero value before reset;
   * the origin of the 00h is unknown, it might be an open-bus value).
   * The read/write protection is released when:
   *   NTSC:  At END of First Vblank (261 scanlines after reset)
   *   PAL:   At END of First Vblank (311 scanlines after reset)
   */
  locked = false;

  vramAccessIncrement() {
    return (this.stat & 4) == 0 ? 1 : 32;
  }

  r8(addr) {
    switch (0x2000 | addr & 7) {
      case PPU.STAT: {
        const stat = this.stat;
        this.stat &= ~(1 << 7);
        this.ffword ^= 1;
        return stat;
      }
      case PPU.SPR_RAM_DATA:
        return this.sprram[this.sprramaddr];
      case PPU.VRAM_DATA: {
        const val = this.vram[this.vramaddr];
        this.vramaddr += this.vramAccessIncrement();
        this.vramaddr &= 0x3fff;
        return val;
      }
      default: break;
    }
    // throw new UnmappedAddressError(addr);
    return 0;
  }

  w8(val, addr) {
    val &= 0xff;
    switch (0x2000 | addr & 7) {
      case PPU.CTRL1:
        this.ctrl1 = val;
        return;
      case PPU.CTRL2:
        this.ctrl2 = val;
        return;
      case PPU.SPR_RAM_DATA:
        this.sprram[this.sprramaddr++] = val;
        this.sprramaddr &= 0xff;
        return;
      case PPU.SPR_RAM_ADDR:
        this.sprramaddr = val;
        return;
      case PPU.BG_SCROLL_OFFSET: {
        const offset = 8 * this.ffword;
        this.bgoffset &= ~(0xff << offset);
        this.bgoffset |= val << offset;
        this.ffword ^= 1;
        return;
      }
      case PPU.VRAM_ADDR: {
        const offset = 8 * this.ffword;
        this.vramaddr &= ~(0xff << offset);
        this.vramaddr |= val << offset;
        this.ffword ^= 1;
        return;
      }
      case PPU.VRAM_DATA: {
        this.vram[this.vramaddr] = val;
        this.vramaddr += this.vramAccessIncrement();
        this.vramaddr &= 0x3fff;
        return;
      }
      default: break;
    }
    throw new UnmappedAddressError(addr);
  }
};
