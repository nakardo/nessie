import './number';
import {debug as Debug} from 'debug';
import now from 'performance-now';
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
  frameCount = 0;
  fps = 0;

  constructor({showFps, onFrame}) {
    this.video = new Video(this, showFps, onFrame);
    Object.seal(this);
  }

  loadCart(buf) {
    debug('loading cart');
    this.cart.load(new Uint8Array(buf));
  }

  runFrame() {
    let cycles;
    FRAMELOOP: for (;;) {
      cycles = this.cpu.step();
      this.frameCycles += cycles;
      for (cycles *= 3; cycles > 0; cycles--) {
        this.ppu.step();
        if (this.ppu.renderFrame) {
          break FRAMELOOP;
        }
      }
    }
    this.ppu.renderFrame = false;
    this.video.render();

    debug(
      'frame: %d, cycles: %d, pc: %s',
      this.frameCount,
      this.frameCycles,
      this.cpu.pc.to(16),
    );

    this.frameCount = ++this.frameCount % 60;
    this.frameCycles = 0;
  }

  reset() {
    debug('reset');
    raf.cancel(this.loop);
    this.frameCycles = 0;
    this.frameCount = 0;
    this.fps = 0;
    if (this.cart.loaded) this.cpu.reset();
    this.ppu.reset();
  }

  start() {
    this.reset();
    let lastTime = now();
    const loop = () => {
      const currentTime = now();
      this.fps = 1000 / (currentTime - lastTime);
      lastTime = currentTime;
      this.runFrame();
      this.loop = raf(loop);
    };
    this.loop = raf(loop);
  }
}
