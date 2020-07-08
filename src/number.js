import assert from 'assert';

Number.prototype.to = function (radix, bytes = 1) {
  assert([2, 16].includes(radix), `${radix} is an invalid radix`);
  const chars = radix == 2 ? 8 * bytes : 2 * bytes;
  const value = this.toString(radix).padStart(chars, 0);
  return `${radix == 2 ? '0b' : '0x'}${value}`;
};
