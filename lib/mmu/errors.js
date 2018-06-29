'use strict';

export class UnmappedAddressError extends Error {
  constructor(addr) {
    super(`${addr.to(16, 4)} is an unknown address`);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
