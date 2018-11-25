import './number';
import {debug as Debug} from 'debug';
import Ppu from './ppu/ppu';
import Mmu from './mmu';
import Cpu from './6502/cpu';
import Cart from './cart/cart';

const debug = Debug('nes');

export default class Nes {
  ppu = new Ppu();
  mmu = new Mmu(this.ppu);
  cpu = new Cpu(this.mmu, this.ppu);
  cart = null;

  constructor() {
    this.ppu.cpu = this.cpu;
  }

  loadCart(buf) {
    debug('loading cart');
    this.cart = new Cart(Uint8Array.from(buf));
    this.mmu.cart = this.cart;
  }

  start() {
    debug('start');
    this.cpu.start();
  }
}
