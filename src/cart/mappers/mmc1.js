import {debug as Debug} from 'debug';

const debug = Debug('nes:cart:mapper:mmc1');

export default class MMC1 {
  prgRom = null;
  prgRam = null;
  chrRxm = null;
  prgRomLastPage = 0;

  shift = 0b10000;
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
  }

  shiftReset() {
    this.shift = 0b10000;
  }

  shiftRight(val) {
    this.shift >>= 1;
    this.shift |= (val & 1) << 4;
  }

  getChrRxmBank(index) {
    if (this.chrRxmBankMode == 0) {
      const bank = this.chrRxmBank[0] & 0x1e;
      if (index == 0) return bank;
      return bank | 1;
    }

    return this.chrRxmBank[index];
  }

  getPrgRomBank(index) {
    const mode = this.prgRomBankMode;
    if (mode == 0 || mode == 1) {
      const bank = this.prgRomBank & 0xe;
      if (index == 0) return bank;
      return bank | 1;
    } else if (mode == 2 && index == 0) {
      return 0;
    } else if (mode == 3 && index == 1) {
      return this.prgRomLastPage;
    }

    return this.prgRomBank;
  }

  w8({val, addr}) {
    if (addr < 0x2000) {
      const bank = this.getChrRxmBank((addr >> 12) & 1);
      this.chrRxm[bank][addr & 0xfff] = val;
    } else if (addr < 0x6000) {
      return 0;
    } else if (addr < 0x8000) {
      this.prgRam[addr & 0x1fff] = val;
    } else {
      if (val & 0x80) {
        debug('reset control');
        this.shiftReset();
        this.mirroring = 0;
        this.prgRomBankMode = 0x2;
        this.chrRxmBankMode = 0;
      } else if ((this.shift & 1) == 0) {
        this.shiftRight(val);
      } else {
        this.shiftRight(val);
        const hnib = addr >> 12;
        debug('writing register: %s, val: %s', hnib.to(16), this.shift.to(2));
        if (addr < 0xa000) {
          this.mirroring = this.shift & 0x2;
          this.prgRomBankMode = (this.shift >> 2) & 0x2;
          this.chrRxmBankMode = (this.shift >> 3) & 1;
        } else if (addr < 0xe000) {
          const index = (hnib >> 1) & 1;
          this.chrRxmBank[index] = this.shift;
          debug(
            'changing chr-rxm[%d] to: %d, mode: %d',
            index,
            this.shift,
            this.chrRxmBankMode,
          );
        } else {
          this.prgRamEnable = (this.shift & 0x10) === 0;
          this.prgRomBank = this.shift & 0xf;
          debug(
            'changing prg-rom to: %d, mode: %d',
            this.prgRomBank,
            this.prgRomBankMode,
          );
        }
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
