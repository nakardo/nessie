'use strict';

import debug from 'debug';
import raf from 'raf';
import instSet from './instruction-set';
import * as FLAG from './status-flags';

const print = debug('nes:cpu');

const MODE_ABS         = 1;
const MODE_ABS_X       = 2;
const MODE_ABS_Y       = 3;
const MODE_ACC         = 4;
const MODE_IMM         = 5;
const MODE_IMP         = 6;
const MODE_IDX_IND     = 7;
const MODE_IND         = 8;
const MODE_IND_IDX     = 9;
const MODE_REL         = 10;
const MODE_ZERO_PAGE   = 11;
const MODE_ZERO_PAGE_X = 12;
const MODE_ZERO_PAGE_Y = 13;

const INT_NMI_ADDR     = 0xfffa;
const INT_RESET_ADDR   = 0xfffc;
const INT_IRQ_BRK_ADDR = 0xfffe;

const MAX_FRAME_CYCLES = 29830;

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

  push(val) {
    print('push');
    this.mmu.w8(val, this.sp++);
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
    print('start');
    const tick = () => {
      this.step();
      this.loop = raf(tick);
    };
    this.pc = this.mmu.r16(INT_RESET_ADDR); // RESET.
    this.loop = raf(tick);
  }

  step() {
    this.t = 0;
    while (this.t < MAX_FRAME_CYCLES) {
      this.handleInterrupts();
      this.runCycle();
    }
    this.pc = this.mmu.r16(INT_NMI_ADDR); // NMI.
  }

  handleInterrupts() {
    if (!this.interrupt()) return;

    if (this.irq) this.irq = false;
    else if (this.break()) this.break(false);
    else return;

    this.interrupt(false);
    this.pc = this.mmu.r16(INT_IRQ_BRK_ADDR);
    this.t += 7;
  }

  runCycle() {
    const opcode = this.mmu.r8(this.pc);
    const next = this.pc + 1;

    print(`pc: 0x${this.pc.toString(16)}, opcode: 0x${opcode.toString(16)}`);

    let src, store;
    let totalCycles = instSet.cycles[opcode];
    switch (instSet.mode[opcode]) {
      case MODE_IMM:
        src = this.mmu.r8(next);
        break;
      case MODE_ABS: {
        const addr = this.mmu.r16(next);
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE_ZERO_PAGE: {
        const addr = this.mmu.r8(next);
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE_IMP:
        break; // Nothing to do here.
      case MODE_ACC:
        src = this.a;
        store = (val) => this.a = val;
        break;
      case MODE_ABS_X: {
        const addr = this.mmu.r16(next) + this.x;
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE_ABS_Y: {
        const addr = this.mmu.r16(next) + this.y;
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE_ZERO_PAGE_X: {
        const addr = this.mmu.r8(next) + this.x;
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE_ZERO_PAGE_Y: {
        const addr = this.mmu.r8(next) + this.y;
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w8(val, addr);
        break;
      }
      case MODE_IND:
        src = this.mmu.r16(this.mmu.r16(next));
        break;
      case MODE_IDX_IND: {
        const addr = this.mmu.r16(this.mmu.r8(next) + this.x);
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w16(val, addr);
        break;
      }
      case MODE_IND_IDX: {
        const addr = this.mmu.r16(this.mmu.r8(next)) + this.y;
        src = this.mmu.r8(addr);
        store = (val) => this.mmu.w16(val, addr);
        break;
      }
      case MODE_REL: {
        const byte = this.mmu.r8(next);
        src = byte & 0x80 ? -((0xff & ~byte) + 1) : byte;
        break;
      }
      default: throw new Error('Unknown addressing mode');
    }
    this.pc += instSet.bytes[opcode];
    this.t += totalCycles;

    instSet.exec[opcode]({cpu: this, mmu: this.mmu, src, store});
  }
};
