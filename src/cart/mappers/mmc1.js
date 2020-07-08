import {debug as Debug} from 'debug';

const debug = Debug('nes:cart:mapper:mmc1');

export default class MMC1 {
  prgRom = null;
  prgRam = null;
  chrRxm = null;
  prgRomLastPage = 0;
  prgRamEnable = false;

  shift = 0;
  shiftCount = 0;

  mirroring = 0;
  prgRomBankMode = 0;
  chrRxmBankMode = 0;
  chrRxmBank = [0, 0];
  prgRomBank = 0;

  constructor({prgRom, prgRam, chrRxm}) {
    this.prgRom = prgRom;
    this.prgRam = prgRam;
    this.chrRxm = chrRxm;
    this.prgRomLastPage = prgRom.length - 1;
    Object.seal(this);
  }

  shiftReset() {
    this.shift = 0;
    this.shiftCount = 0;
  }

  shiftRight(val) {
    this.shift >>= 1;
    this.shift |= (val & 1) << 4;
    this.shiftCount++;
  }

  getChrRxmBank(index) {
    if (this.chrRxmBankMode == 0) {
      if (index == 0) return this.chrRxmBank[0] & 0xfe;
      else return this.chrRxmBank[1] | 1;
    } else {
      return this.chrRxmBank[index];
    }
  }

  getPrgRomBank(index) {
    const mode = this.prgRomBankMode;
    if (mode == 0 || mode == 1) {
      if (index == 0) return this.prgRomBank & 0xfe;
      else return this.prgRomBank | 1;
    } else if (mode == 2) {
      if (index == 0) return 0;
      else return this.prgRomBank;
    } else if (mode == 3) {
      if (index == 0) return this.prgRomBank;
      else return this.prgRomLastPage;
    }
  }

  writeRegister(addr) {
    const hnib = addr >> 12;
    debug('write register: %s, val: %s', hnib.to(16), this.shift.to(2));
    if (addr < 0xa000) {
      debug('set control: %s', this.shift.to(2));
      this.mirroring = this.shift & 3;
      this.prgRomBankMode = (this.shift >> 2) & 3;
      this.chrRxmBankMode = (this.shift >> 4) & 1;
    } else if (addr < 0xe000) {
      const index = (addr >> 14) & 1;
      this.chrRxmBank[index] = this.shift & 0x1f;
      debug('set bank chr-rxm[%d]: %d', index, this.shift);
    } else {
      this.prgRamEnable = (this.shift & 0x10) == 0;
      this.prgRomBank = this.shift & 0xf;
      debug('set bank prg-rom: %d', this.prgRomBank);
      debug('prg-ram enable', this.prgRamEnable);
    }
  }

  w8({val, addr}) {
    if (addr < 0x2000) {
      const bank = this.getChrRxmBank((addr >> 12) & 1);
      this.chrRxm[bank][addr & 0xfff] = val;
    } else if (addr < 0x6000) {
      return;
    } else if (addr < 0x8000) {
      if (this.prgRamEnable) {
        this.prgRam[addr & 0x1fff] = val;
      }
    } else {
      if (val & 0x80) {
        debug('reset control');
        this.prgRomBankMode = 3;
        this.shiftReset();
      } else if (this.shiftCount < 4) {
        this.shiftRight(val);
      } else {
        this.shiftRight(val);
        this.writeRegister(addr);
        this.shiftReset();
      }
    }
  }

  r8(addr) {
    if (addr < 0x2000) {
      const bank = this.getChrRxmBank((addr >> 12) & 1);
      return this.chrRxm[bank][addr & 0xfff];
    } else if (addr < 0x6000) {
      return 0;
    } else if (addr < 0x8000) {
      return this.prgRam[addr & 0x1fff];
    } else {
      const bank = this.getPrgRomBank((addr >> 14) & 1);
      return this.prgRom[bank][addr & 0x3fff];
    }
  }
}
