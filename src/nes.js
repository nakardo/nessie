import './number';
import {debug as Debug} from 'debug';
import Cpu from './6502/cpu';
import Mmu from './mmu';
import Cart from './cart/cart';

const debug = Debug('nes');

export default class Nes {
  mmu = new Mmu();
  cpu = new Cpu(this.mmu);

  loadCart(buf) {
    debug('loading cart');
    this.mmu.cart = new Cart(Uint8Array.from(buf));
  }

  start() {
    debug('start');
    this.cpu.start();
  }
}
