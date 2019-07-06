import './number';
import {debug as Debug} from 'debug';
import {createCanvas} from 'canvas';
import raf from 'raf';
import Cart from './cart';
import * as Cpu from './cpu';
import Ppu from './ppu';
import Screen from './screen';

const debug = Debug('nes');

const MAX_FRAME_CYCLES = 29830;

export default class Nes {
  screen = new Screen(createCanvas(256, 240));
  cart = new Cart();
  ppu = new Ppu(this.cart, this.screen);
  cpu = new Cpu.MOS6502(new Cpu.Memory(this.cart, this.ppu));
  loop = null;

  constructor() {
    this.ppu.cpu = this.cpu;
  }

  loadCart(buf) {
    debug('loading cart');
    this.cart.load(Uint8Array.from(buf));
  }

  runFrame() {
    let cycles = 0;
    while (cycles < MAX_FRAME_CYCLES) {
      this.cpu.step();
      cycles += this.cpu.cycles;
      this.ppu.step(cycles * 3);
    }
    this.screen.render();
  }

  start() {
    debug('start');
    const loop = () => {
      this.runFrame();
      this.loop = raf(loop);
    };
    this.cpu.reset();
    this.loop = raf(loop);
  }
}
