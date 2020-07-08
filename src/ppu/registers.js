/**
 * Controller ($2000) > write
 * Common name: PPUCTRL
 * Description: PPU control register
 * Access: write
 *
 * Various flags controlling PPU operation
 *
 * 7  bit  0
 * ---- ----
 * VPHB SINN
 * |||| ||||
 * |||| ||++- Base nametable address
 * |||| ||    (0 = $2000; 1 = $2400; 2 = $2800; 3 = $2C00)
 * |||| |+--- VRAM address increment per CPU read/write of PPUDATA
 * |||| |     (0: add 1, going across; 1: add 32, going down)
 * |||| +---- Sprite pattern table address for 8x8 sprites
 * ||||       (0: $0000; 1: $1000; ignored in 8x16 mode)
 * |||+------ Background pattern table address (0: $0000; 1: $1000)
 * ||+------- Sprite size (0: 8x8 pixels; 1: 8x16 pixels)
 * |+-------- PPU master/slave select
 * |          (0: read backdrop from EXT pins; 1: output color on EXT pins)
 * +--------- Generate an NMI at the start of the
 *            vertical blanking interval (0: off; 1: on)
 */
export const PPUCTRL = 0x2000;
export const PPUMASK = 0x2001;
export const PPUSTATUS = 0x2002;
export const OAMADDR = 0x2003;
export const OAMDATA = 0x2004;
export const PPUSCROLL = 0x2005;
export const PPUADDR = 0x2006;
export const PPUDATA = 0x2007;
export const OAMDMA = 0x4014;
