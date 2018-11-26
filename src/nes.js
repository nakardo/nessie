import './number';
import {debug as Debug} from 'debug';
import raf from 'raf';
import Ppu from './ppu/ppu';
import Mmu from './mmu';
import Cpu from './6502/cpu';
import Cart from './cart/cart';

const debug = Debug('nes');

const MAX_FRAME_CYCLES = 29830;

export default class Nes {
  ppu = new Ppu();
  mmu = new Mmu(this.ppu);
  cpu = new Cpu(this.mmu);
  cart = null;
  loop = null;

  constructor() {
    this.ppu.cpu = this.cpu;
  }

  loadCart(buf) {
    debug('loading cart');
    this.cart = new Cart(Uint8Array.from(buf));
    this.mmu.cart = this.cart;
  }

  runFrame() {
    let cycles = 0;
    while (cycles < MAX_FRAME_CYCLES) {
      this.cpu.step();
      cycles += this.cpu.cycles;
      this.ppu.step(cycles * 3);
    }
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
