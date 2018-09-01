import {UnmappedAddressError} from '../../errors';

export default class Mapper {
  rom = null;
  ram = null;
  romBank0 = 0;
  romBank1 = 0;

  constructor({rom, ram}) {
    this.rom = rom;
    this.ram = ram;
    this.romBank1 = this.rom.length - 1;
  }

  r8(addr) {
    switch (addr >> 12) {
      case 0x6:
      case 0x7:
        return this.ram[addr & 0x1fff];
      case 0x8:
      case 0x9:
      case 0xa:
      case 0xb:
        return this.rom[this.romBank0][addr & 0x3fff];
      case 0xc:
      case 0xd:
      case 0xe:
      case 0xf:
        return this.rom[this.romBank1][addr & 0x3fff];
      default:
        break;
    }
    throw new UnmappedAddressError(addr);
  }
}
