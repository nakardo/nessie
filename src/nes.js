import './number';
import {debug as Debug} from 'debug';
import raf from 'raf';
import Cart from './cart';
import MOS6502, {Memory} from './cpu/6502';
import Ppu from './ppu';
import Video from './video';
import Controller from './controller';

const debug = Debug('nes');

export default class Nes {
  video = null;
  cart = new Cart(this);
  ppu = new Ppu(this);
  cpu = new MOS6502(new Memory(this));
  controller = new Controller();
  loop = null;

  frameCycles = 0;

  constructor({onFrame}) {
    this.video = new Video(this, onFrame);
    Object.seal(this);
  }

  loadCart(buf) {
    debug('loading cart');
    this.cart.load(new Uint8Array(buf));
    this.video.updateNametableIndexes(this.cart.mirroring);
  }

  runFrame() {
    let cycles;
    FRAMELOOP: for (;;) {
      cycles = this.cpu.step();
      this.frameCycles += cycles;
      // WTF(nakardo): ntsc ppu should run at 3 times the cpu rate?
      // See:
      // - https://wiki.nesdev.com/w/index.php?title=PPU_frame_timing#CPU-PPU_Clock_Alignment
      // - https://wiki.nesdev.com/w/index.php?title=CPU#Notes
      for (cycles *= 4; cycles > 0; cycles--) {
        this.ppu.step();
        if (this.ppu.renderFrame) {
          break FRAMELOOP;
        }
      }
    }
    this.ppu.renderFrame = false;
    this.video.render();

    debug('cycles: %d, pc: %s', this.frameCycles, this.cpu.pc.to(16));
    this.frameCycles = 0;
  }

  reset() {
    debug('reset');
    raf.cancel(this.loop);
    this.frameCycles = 0;
    if (this.cart.loaded) this.cpu.reset();
    this.ppu.reset();
  }

  start() {
    this.reset();
    const loop = () => {
      this.runFrame();
      this.loop = raf(loop);
    };
    this.loop = raf(loop);
  }
}
