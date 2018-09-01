import {debug as Debug} from 'debug';
import MAPPERS from './mappers/mappers';

const debug = Debug('nes:cart');

export default class Cart {
  mapper = null;

  constructor(data) {
    debug('ROM Control Byte #1: %s', data[6].to(2));
    debug('ROM Control Byte #2: %s', data[7].to(2));

    const index = (data[6] >> 4) | (data[7] & 0xf0);
    const Mapper = MAPPERS[index];
    debug('mapper idx: %d, class: %s', index, Mapper.name);

    this.mapper = new Mapper(data);
  }

  r8(addr) {
    return this.mapper.r8(addr);
  }

  w8({val, addr}) {
    return this.mapper.w8({val, addr});
  }
}
