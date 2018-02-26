'use strict';

const Debug = require('debug')('nes:cpu');
const Raf = require('raf');
const Instructions = require('./instructions')

const FLAG_SIGN        = 1 << 7;
const FLAG_OVERFLOW    = 1 << 6;
const FLAG_BREAK       = 1 << 4;
const FLAG_DECIMAL     = 1 << 3;
const FLAG_INTERRUPT   = 1 << 2;
const FLAG_ZERO        = 1 << 1;
const FLAG_CARRY       = 1;

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

module.exports = class Cpu {
  constructor(mmu) {
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.stat = 0;
    this.pc = 0;
    this.sp = 0;
    this.t = 0;
    this.mmu = mmu;
    this.irq = false;
    this.loop = null;
  }

  push(val) {
    Debug('push');
    this.mmu.w8(val, this.sp++);
  }

  sign(val) {
    if (val !== undefined) {
      if (val & FLAG_SIGN) this.stat |= FLAG_SIGN;
      else this.stat &= ~FLAG_SIGN;
    }
    return !!(this.stat & FLAG_SIGN);
  }

  overflow(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG_OVERFLOW;
      else this.stat &= ~FLAG_OVERFLOW;
    }
    return !!(this.stat & FLAG_OVERFLOW);
  }

  break(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG_BREAK;
      else this.stat &= ~FLAG_BREAK;
    }
    return !!(this.stat & FLAG_BREAK);
  }

  decimal(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG_DECIMAL;
      else this.stat &= ~FLAG_DECIMAL;
    }
    return !!(this.stat & FLAG_DECIMAL);
  }

  interrupt(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG_INTERRUPT;
      else this.stat &= ~FLAG_INTERRUPT;
    }
    return !!(this.stat & FLAG_INTERRUPT);
  }

  zero(val) {
    if (val !== undefined) {
      if (val == 0) this.stat |= FLAG_ZERO;
      else this.stat &= ~FLAG_ZERO;
    }
    return !!(this.stat & FLAG_ZERO);
  }

  carry(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG_CARRY;
      else this.stat &= ~FLAG_CARRY;
    }
    return !!(this.stat & FLAG_CARRY);
  }

  start() {
    Debug('start');
    const tick = () => {
      this.step();
      this.loop = Raf(tick);
    };
    this.pc = INT_RESET_ADDR; // Reset.
    this.loop = Raf(tick);
  }

  step() {
    this.t = 0;
    while (this.t < MAX_FRAME_CYCLES) {
      this.handleInterrupts();
      this.runCycle();
    }
  }

  handleInterrupts() {
    if (!this.interrupt()) {
      return;
    }

    let addr;
    if (this.irq) {
      addr = INT_IRQ_BRK_ADDR;
      this.irq = false;
    } else if (this.break()) {
      addr = INT_IRQ_BRK_ADDR;
      this.break(false);
    }
    this.interrupt(false);

    this.pc = addr;
    this.t += 7;
  }

  runCycle() {
    const opcode = this.mmu.r8(this.pc);
    const next = this.pc + 1;

    Debug(`pc: 0x${this.pc.toString(16)}, opcode: 0x${opcode.toString(16)}`);

    let src, store;
    let totalCycles = Instructions.cycles[opcode];
    switch (Instructions.mode[opcode]) {
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
    this.pc += Instructions.bytes[opcode];
    this.t += totalCycles;

    Instructions.fn[opcode]({cpu: this, mmu: this.mmu, src, store});
  }
};
