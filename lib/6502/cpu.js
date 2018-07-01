import {debug as Debug} from 'debug';
import raf from 'raf';
import instSet from './instruction-set';
import * as FLAG from './status-flags';
import * as MODE from './address-mode';
import * as INT from './interrupts';

const debug = Debug('nes:cpu');

export default class Cpu {
  constructor(mmu) {
    this.mmu = mmu;
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.stat = 0;
    this.pc = 0;
    this.sp = 0;
    this.t = 0;
    this.irq = false;
    this.loop = null;
  }

  push8(val) {
    this.mmu.w8(val, this.sp++);
    this.sp &= 0xff;
  }

  push16(val) {
    this.mmu.w16(val, this.sp);
    this.sp += 2;
    this.sp &= 0xff;
  }

  pull8() {
    const val = this.mmu.r8(this.sp--);
    this.sp &= 0xff;
    return val;
  }

  pull16() {
    const val = this.mmu.r16(this.sp);
    this.sp -= 2;
    this.sp &= 0xff;
    return val;
  }

  sign(val) {
    if (val !== undefined) {
      if (val & FLAG.SIGN) this.stat |= FLAG.SIGN;
      else this.stat &= ~FLAG.SIGN;
    }
    return !!(this.stat & FLAG.SIGN);
  }

  overflow(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG.OVERFLOW;
      else this.stat &= ~FLAG.OVERFLOW;
    }
    return !!(this.stat & FLAG.OVERFLOW);
  }

  break(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG.BREAK;
      else this.stat &= ~FLAG.BREAK;
    }
    return !!(this.stat & FLAG.BREAK);
  }

  decimal(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG.DECIMAL;
      else this.stat &= ~FLAG.DECIMAL;
    }
    return !!(this.stat & FLAG.DECIMAL);
  }

  interrupt(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG.INTERRUPT;
      else this.stat &= ~FLAG.INTERRUPT;
    }
    return !!(this.stat & FLAG.INTERRUPT);
  }

  zero(val) {
    if (val !== undefined) {
      if (val == 0) this.stat |= FLAG.ZERO;
      else this.stat &= ~FLAG.ZERO;
    }
    return !!(this.stat & FLAG.ZERO);
  }

  carry(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG.CARRY;
      else this.stat &= ~FLAG.CARRY;
    }
    return !!(this.stat & FLAG.CARRY);
  }

  start() {
    debug('start');
    const tick = () => {
      this.step();
      this.loop = raf(tick);
    };
    this.pc = this.mmu.r16(INT.RESET_ADDR);
    this.loop = raf(tick);
  }

  step() {
    this.t = 0;
    while (this.t < 29830 /* max frame cycles */) {
      this.handleInterrupts();
      this.runCycle();
    }
    this.pc = this.mmu.r16(INT.NMI_ADDR);
  }

  handleInterrupts() {
    if (!this.interrupt()) return;

    if (this.irq) this.irq = false;
    else if (this.break()) this.break(false);
    else return;

    this.interrupt(false);
    this.pc = this.mmu.r16(INT.IRQ_BRK_ADDR);
    this.t += 7;
  }

  decode() {
    return instSet[this.mmu.r8(this.pc)];
  }

  pageCrossedCycles(addr) {
    const {branchCycles} = this.decode();
    return (this.pc & 0xff00) != (addr & 0xff00) ? branchCycles : 0;
  }

  runCycle() {
    const {opcode, execute, mode, bytes, cycles} = this.decode();
    const next = this.pc + 1;

    debug('pc: %s, opcode: %s', this.pc.to(16, 4), opcode.to(16));

    let src, store;
    let totalCycles = cycles;
    switch (mode) {
      case MODE.IMM:
        src = this.mmu.r8(next);
        break;
      case MODE.ABS: {
        const addr = this.mmu.r16(next);
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE.ZERO_PAGE: {
        const addr = this.mmu.r8(next);
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE.IMP:
        break; // Nothing to do here.
      case MODE.ACC:
        src = this.a;
        store = (val) => this.a = val;
        break;
      case MODE.ABS_X: {
        const addr = this.mmu.r16(next) + this.x;
        src = this.mmu.r8(addr);
        totalCycles += this.pageCrossedCycles(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE.ABS_Y: {
        const addr = this.mmu.r16(next) + this.y;
        src = this.mmu.r8(addr);
        totalCycles += this.pageCrossedCycles(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE.ZERO_PAGE_X: {
        const addr = this.mmu.r8(next) + this.x;
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE.ZERO_PAGE_Y: {
        const addr = this.mmu.r8(next) + this.y;
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE.IND:
        src = this.mmu.r16(this.mmu.r16(next));
        break;
      case MODE.IDX_IND: {
        const addr = this.mmu.r16(this.mmu.r8(next) + this.x);
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w16(val, addr);
        break;
      }
      case MODE.IND_IDX: {
        const addr = this.mmu.r16(this.mmu.r8(next)) + this.y;
        src = this.mmu.r8(addr);
        totalCycles += this.pageCrossedCycles(addr);
        store = (val) => this.mmu.w16(val, addr);
        break;
      }
      case MODE.REL:
        src = this.mmu.r8(next).signed();
        break;
      default:
        throw new Error('Unknown addressing mode');
    }

    this.pc = (this.pc + bytes) & 0xffff;
    this.t += totalCycles;

    execute({cpu: this, mmu: this.mmu, src, store});
  }
};
