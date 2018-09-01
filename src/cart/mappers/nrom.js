import Mapper from './mapper';
import {UnmappedAddressError} from '../../errors';

export default class NROM extends Mapper {
  w8({val, addr}) {
    switch (addr >> 12) {
      case 0x6:
      case 0x7:
        this.ram[addr & 0x1fff] = val;
        return;
      default:
        break;
    }
    throw new UnmappedAddressError(addr);
  }
}
