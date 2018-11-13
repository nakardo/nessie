import {debug as Debug} from 'debug';
import {UnmappedAddressError} from '../errors';
import * as PPU from './registers';

const debug = Debug('nes:ppu');

export default class Ppu {
  // 8 kbytes rom or ram on cart + mappers
  // 2 kbytes ram in the console

  // 2 address spaces palette (internal ppu)
  // oam for sprites (internal ppu)

  r8(addr) {
    debug('read at: %s', addr.to(16, 2));
    return 0;
    // throw new UnmappedAddressError(addr);
  }

  w8({val, addr}) {
    debug('write at: %s, val: %s', addr.to(16, 2), val.to(16));
  }
}
