'use strict';

import {debug as Debug} from 'debug';
import MAPPERS from './mappers/mappers';

export default class Cart {
  mapper = null;

  constructor(data) {
    const mapper = ((data[6] >> 4) | data[7] & 0xf0);

    debug('ROM Control Byte #1: %s', data[6].to(2));
    debug('ROM Control Byte #2: %s', data[7].to(2));
    debug('Mapper #: %d', mapper);

    this.mapper = new (MAPPERS[mapper])(data);
  }
}
