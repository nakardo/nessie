import assert from 'assert';
import leftPad from 'left-pad';

Number.prototype.to = function(radix, bytes = 1) {
  assert([2, 16].includes(radix), `${radix} is an invalid radix`);
  const chars = radix == 2 ? 8 * bytes : 2 * bytes;
  const value = leftPad(this.toString(radix), chars, 0);
  return `${radix == 2 ? '0b' : '0x'}${value}`;
};

Number.prototype.signed = function() {
  return (this & 0x80) > 0 ? -((0xff & ~this) + 1) : this;
};
