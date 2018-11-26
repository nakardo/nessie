import MOS6502 from './6502';
import MemoryMap from './memory-map';

export default class extends MOS6502 {
  constructor(cart, ppu) {
    super(new MemoryMap(cart, ppu));
  }
}
