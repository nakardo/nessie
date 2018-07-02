// 2000h - PPU Control Register 1 (W)
//
//   Bit7  Execute NMI on VBlank             (0=Disabled, 1=Enabled)
//   Bit6  PPU Master/Slave Selection        (0=Master, 1=Slave) (Not used in NES)
//   Bit5  Sprite Size                       (0=8x8, 1=8x16)
//   Bit4  Pattern Table Address Background  (0=VRAM 0000h, 1=VRAM 1000h)
//   Bit3  Pattern Table Address 8x8 Sprites (0=VRAM 0000h, 1=VRAM 1000h)
//   Bit2  Port 2007h VRAM Address Increment (0=Increment by 1, 1=Increment by 32)
//   Bit1-0 Name Table Scroll Address        (0-3=VRAM 2000h,2400h,2800h,2C00h)
//   (That is, Bit0=Horizontal Scroll by 256, Bit1=Vertical Scroll by 240)
export const CTRL1 = 0x2000;

// 2001h - PPU Control Register 2 (W)
//
//   Bit7-5 Color Emphasis       (0=Normal, 1-7=Emphasis) (see Palettes chapter)
//   Bit4  Sprite Visibility     (0=Not displayed, 1=Displayed)
//   Bit3  Background Visibility (0=Not displayed, 1=Displayed)
//   Bit2  Sprite Clipping       (0=Hide in left 8-pixel column, 1=No clipping)
//   Bit1  Background Clipping   (0=Hide in left 8-pixel column, 1=No clipping)
//   Bit0  Monochrome Mode       (0=Color, 1=Monochrome)  (see Palettes chapter)
//
// If both sprites and BG are disabled (Bit 3,4=0) then video output is
// disabled, and VRAM can be accessed at any time (instead of during VBlank
// only). However, SPR-RAM does no longer receive refresh cycles, and its
// content will gradually degrade when the display is disabled.
export const CTRL2 = 0x2001;

// 2002h - PPU Status Register (R)
//
//   Bit7   VBlank Flag    (1=VBlank)
//   Bit6   Sprite 0 Hit   (1=Background-to-Sprite0 collision)
//   Bit5   Lost Sprites   (1=More than 8 sprites in 1 scanline)
//   Bit4-0 Not used       (Undefined garbage)
//
// Reading resets the 1st/2nd-write flipflop (used by Port 2005h and 2006h).
// Reading resets Bit7, can be used to acknowledge NMIs, Bit7 is also
// automatically reset at the end of VBlank, so manual acknowledge is normally
// not required (unless one wants to free the NMI signal for external NMI
// inputs) (and unless one wants to disable/reenable NMIs during NMI handling,
// in that case Bit7 MUST be acknowledge before reenabling NMIs, else NMI would
// be executed another time).
export const STAT = 0x2002;

// 2003h - SPR-RAM Address Register (W)
//
//   D7-D0: 8bit address in SPR-RAM  (00h-FFh)
//
// Specifies the destination address in Sprite RAM for use with Port 2004h
// (Single byte write), and Port 4014h (256 bytes DMA transfer).
// This register is internally used during rendering (and typically contains
// 00h at the begin of the VBlank period).
export const SPR_RAM_ADDR = 0x2003;

// 2004h - SPR-RAM Data Register (Read/Write)
//
//   D7-D0: 8bit data written to SPR-RAM.
//
// Read/write data to/from selected address in Sprite RAM.
// The Port 2003h address is auto-incremented by 1 after each <write> to 2004h.
// The address is NOT auto-incremented after <reading> from 2004h.
export const SPR_RAM_DATA = 0x2004;

// 2005h - PPU Background Scrolling Offset (W2)
//
// Defines the coordinates of the upper-left background pixel, together with PPU
// Control Register 1, Port 2000h, Bits 0-1).
//
//   Port 2005h-1st write: Horizontal Scroll Origin (X*1) (0-255)
//   Port 2005h-2nd write: Vertical Scroll Origin   (Y*1) (0-239)
//   Port 2000h-Bit0: Horizontal Name Table Origin  (X*256)
//   Port 2000h-Bit1: Vertical Name Table Origin    (Y*240)
//
// Caution: The above scroll reload settings are overwritten by writes to Port
// 2006h. See PPU Scrolling chapter for more info
export const BG_SCROLL_OFFSET = 0x2005;

// 2006h - VRAM Address Register (W2)
//
// Used to specify the 14bit VRAM Address for use with Port 2007h.
//   Port 2006h-1st write: VRAM Address Pointer MSB (6bit)
//   Port 2006h-2nd write: VRAM Address Pointer LSB (8bit)
//
// Caution: Writes to Port 2006h are overwriting scroll reload bits (in Port
// 2005h and Bit0-1 of Port 2000h). And, the PPU uses the Port 2006h register
// internally during rendering, when the display is enabled one should thus
// reinitialize Port 2006h at begin of VBlank before accessing VRAM via Port
// 2007h.
export const VRAM_ADDR = 0x2006;

// 2007h - VRAM Read/Write Data Register (RW)
//
// The PPU will auto-increment the VRAM address (selected via Port 2006h) after
// each read/write from/to Port 2007h by 1 or 32 (depending on Bit2 of $2000).
//
//   Bit7-0  8bit data read/written from/to VRAM
//
// Caution: Reading from VRAM 0000h-3EFFh loads the desired value into a latch,
// and returns the OLD content of the latch to the CPU. After changing the
// address one should thus always issue a dummy read to flush the old content.
// However, reading from Palette memory VRAM 3F00h-3FFFh, or writing to
// VRAM 0000-3FFFh does directly access the desired address.
//
// Note: Some (maybe all) RGB PPUs (as used in Famicom Titler) do not allow to
// read palette memory (instead, they appear to mirror 3Fxxh to 2Fxxh).
export const VRAM_DATA = 0x2007;
