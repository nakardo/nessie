import {debug as Debug} from 'debug';
import {createCanvas} from 'canvas';
import palette from './palette';

const debug = Debug('nes:video');

const FRAME_WIDTH = 256;
const FRAME_HEIGHT = 240;

const OAM_SPRITE_X = 3;
const OAM_SPRITE_Y = 0;
const OAM_SPRITE_INDEX = 1;
const OAM_SPRITE_ATTR = 2;

export default class Video {
  ppu = null;
  cart = null;
  onFrame = () => {};

  bkgPalette = 0;
  linePtrn = new Array(FRAME_WIDTH).fill(0);
  lineColor = new Array(FRAME_WIDTH);

  canvas = createCanvas(FRAME_WIDTH, FRAME_HEIGHT);
  ctx = this.canvas.getContext('2d', {alpha: false, pixelFormat: 'RGB24'});
  image = this.ctx.getImageData(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  data = this.image.data;

  nametable = new Array(2).fill().map(() => {
    return new Array(30).fill().map(() => new Uint8Array(32));
  });
  attribute = new Array(2).fill().map(() => {
    return new Array(8).fill().map(() => {
      return new Array(8).fill().map(() => new Array(4).fill(0));
    });
  });
  pattern = new Array(2).fill().map(() => {
    return new Array(0x100).fill().map(() => {
      return new Array(8).fill().map(() => new Uint8Array(8));
    });
  });
  palette = new Array(8).fill().map(() => new Array(3).fill(0));
  sprites = new Array(64).fill().map(() => new Uint8Array(4));

  constructor(ppu, cart, onFrame) {
    this.ppu = ppu;
    this.cart = cart;
    this.onFrame = onFrame;

    this.ctx.patternQuality = 'fast';
    this.ctx.quality = 'fast';
    this.ctx.textDrawingMode = 'path';
    this.ctx.antialias = 'none';

    Object.seal(this);
  }

  updatePattern(table, val, addr) {
    const row = this.pattern[table][(addr >> 4) & 0xff][addr & 7];
    const plane = (addr >> 3) & 1;
    for (let i = 0; i < row.length; i++) {
      const col = 7 - i;
      if (!plane) row[col] = 0;
      row[col] |= ((val >> i) & 1) << plane;
    }
  }

  drawBackground() {
    const [xscroll, yscroll] = this.ppu.scroll;
    const yoffset = yscroll + this.ppu.scanline;
    const ysprite = yoffset & 7;
    const row = (yoffset >> 3) % 30;

    let table = (this.ppu.ctrl & 3) >> 1;
    if (!this.cart.mirroring && yoffset >= FRAME_HEIGHT) table = ++table & 1;

    const nametable = this.nametable[table];
    const attrtable = this.attribute[table];
    const ptrntable = this.pattern[(this.ppu.ctrl & 0x10) >> 4];

    const maskoffset = ((this.ppu.mask & 2) << 2) ^ 8;
    for (let x = maskoffset; x < FRAME_WIDTH; x++) {
      const xoffset = xscroll + x;
      const col = (xoffset >> 3) & 0x1f;
      const tile = nametable[row][col];
      const ptrn = (this.linePtrn[x] = ptrntable[tile][ysprite][xoffset & 7]);

      if (!ptrn) continue;
      const attr = attrtable[row >> 2][col >> 2];
      const color = this.palette[attr[(row & 2) | ((col >> 1) & 1)]][ptrn - 1];
      this.lineColor[x] = color;
    }
  }

  drawSprites() {
    const ptrntable = this.pattern[(this.ppu.ctrl & 8) >> 3];
    // const size = (this.ppu.ctrl & 0x20) >> 5;

    let indexes = [];
    for (let i = 0; i < this.sprites.length; i++) {
      if (
        this.ppu.scanline > this.sprites[i][OAM_SPRITE_Y] &&
        this.ppu.scanline <= this.sprites[i][OAM_SPRITE_Y] + 8 &&
        this.sprites[i][OAM_SPRITE_Y] < 0xef
      )
        indexes.push(i);
    }

    if (indexes.length > 8) this.ppu.stat |= 0x20;

    const masked = (((this.ppu.mask >> 1) & 3) ^ 3) > 0;
    for (let i = Math.min(8, indexes.length) - 1; i > -1; i--) {
      const s = this.sprites[indexes[i]];
      const priority = (s[OAM_SPRITE_ATTR] >> 5) & 1;
      const xflip = (s[OAM_SPRITE_ATTR] >> 6) & 1;
      const yflip = s[OAM_SPRITE_ATTR] >> 7;
      const sx = s[OAM_SPRITE_X];
      const sy = this.ppu.scanline - s[OAM_SPRITE_Y] - 1;
      const py = yflip ? 7 - sy : sy;

      for (let x = sx; x < sx + 8 && x < FRAME_WIDTH; x++) {
        const px = xflip ? 7 - (x - sx) : x - sx;
        const ptrn = ptrntable[s[OAM_SPRITE_INDEX]][py][px];

        if (!ptrn) continue;
        const color = this.palette[4 | (s[OAM_SPRITE_ATTR] & 3)][ptrn - 1];
        if (!indexes[i] && color && this.linePtrn[x]) {
          if (
            (x > 7 && x < 255) ||
            (x < 7 && !masked) // && this.ppu.scanline < 239
          )
            this.ppu.stat |= 0x40;
        }
        if (!priority || !this.linePtrn[x]) this.lineColor[x] = color;
      }
    }
  }

  drawLine() {
    debug('drawing scanline: %d', this.ppu.scanline);

    this.linePtrn.fill(0);
    this.lineColor.fill(this.bkgPalette);

    if (this.ppu.mask & 8) this.drawBackground();
    if (this.ppu.mask & 0x10) this.drawSprites();

    let offset = this.ppu.scanline * FRAME_WIDTH * 4;
    for (let x = 0; x < FRAME_WIDTH; x++) {
      this.data[offset++] = palette[this.lineColor[x]][0];
      this.data[offset++] = palette[this.lineColor[x]][1];
      this.data[offset++] = palette[this.lineColor[x]][2];
      this.data[offset++] = 255;
    }
  }

  render() {
    this.ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    this.ctx.putImageData(this.image, 0, 0);
    this.onFrame(this.canvas);
  }
}
