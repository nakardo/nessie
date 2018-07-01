import './util';
import {debug as Debug} from 'debug';
import Cpu from './6502/cpu';
import Mmu from './mmu/mmu';

const debug = Debug('nes');

export default class Nes {
  mmu = new Mmu();
  cpu = new Cpu(this.mmu);

  loadCart(buf) {
    this.mmu.loadCart(buf);
  }

  start() {
    debug('start');
    this.cpu.start();
  }
}
