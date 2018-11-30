import MOS6502 from './6502';
import Memory from './memory';

export default class extends MOS6502 {
  constructor(cart, ppu) {
    super(new Memory(cart, ppu));
  }
}
