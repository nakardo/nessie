'use strict';

import assert from 'assert';
import leftPad from 'left-pad';

Number.prototype.to = function(radix, bytes = 2) {
  assert([2, 16].includes(radix), `${radix} is an invalid radix`);
  const chars = Math.pow(2, radix == 2 ? bytes + 1 : 1);
  const value = leftPad(this.toString(radix), chars, 0);
  return `${radix == 2 ? '0b' : '0x'}${value}`;
};
