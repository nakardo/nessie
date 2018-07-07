import {debug as Debug} from 'debug';
import raf from 'raf';
import instSet from './instruction-set';
import * as FLAG from './status-flags';
import * as MODE from './address-mode';
import * as INT from './interrupts';

const debug = Debug('nes:cpu');
const interrupt = Debug('nes:cpu:int');
const push = Debug('nes:cpu:push');
const pull = Debug('nes:cpu:pull');

const MAX_FRAME_CYCLES = 29830;

export default class Cpu {
  a = 0;
  x = 0;
  y = 0;
  stat = 0;
  pc = 0;
  sp = 0;
  t = 0;
  irq = false;
  loop = null;

  constructor(mmu) {
    this.mmu = mmu;
  }

  r8(addr) {
    return this.mmu.r8(addr);
  }

  r16(addr) {
    return this.mmu.r16(addr);
  }

  w8(val, addr) {
    this.mmu.w8(val, addr);
  }

  push8(val) {
    val &= 0xff;
    const addr = 0x100 | this.sp;
    push('to: %s, val: %s', addr.to(16, 4), val.to(16));
    this.w8(val, addr);
    this.sp = --this.sp & 0xff;
  }

  push16(val) {
    this.push8(val >> 8);
    this.push8(val);
  }

  pull8() {
    this.sp = ++this.sp & 0xff;
    const addr = 0x100 | this.sp;
    const val = this.r8(addr);
    pull('from: %s, val: %s', addr.to(16, 4), val.to(16));
    return val;
  }

  pull16() {
    return this.pull8() | this.pull8() << 8;
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
    const addr = this.r16(INT.RESET_ADDR);
    const tick = () => {
      this.step();
      this.loop = raf(tick);
    };
    debug('start at: %s', addr.to(16, 4));
    this.pc = addr;
    this.loop = raf(tick);
  }

  step() {
    this.t = 0;
    while (this.t < MAX_FRAME_CYCLES) {
      this.handleInterrupts();
      this.runCycle();
    }
    this.pc = this.r16(INT.NMI_ADDR);
  }

  handleInterrupts() {
    if (!this.interrupt()) return;

    if (this.irq) this.irq = false;
    else if (this.break()) this.break(false);
    else return;

    this.interrupt(false);
    this.pc = this.r16(INT.IRQ_BRK_ADDR);
    this.t += 7;

    interrupt('pc: %s', this.pc.to(16));
  }

  decode() {
    return instSet[this.r8(this.pc)];
  }

  pageCrossedCycles({branchCycles, addr}) {
    return (this.pc & 0xff00) != (addr & 0xff00) ? branchCycles : 0;
  }

  runCycle() {
    const inst = this.decode();
    const {opcode, mode, bytes, cycles, branchCycles, execute} = inst;
    const next = this.pc + 1;

    debug('pc: %s, opcode: %s', this.pc.to(16, 4), opcode.to(16));

    let addr, src, store;
    let totalCycles = cycles;
    switch (mode) {
      case MODE.ABS:
        addr = this.r16(next);
        src = this.r8(addr);
        store = (val) => this.w8(val, addr);
        break;
      case MODE.ABS_X:
        addr = this.r16(next) + this.x;
        src = this.r8(addr);
        totalCycles += this.pageCrossedCycles({branchCycles, addr});
        store = (val) => this.w8(val, addr);
        break;
      case MODE.ABS_Y:
        addr = this.r16(next) + this.y;
        src = this.r8(addr);
        totalCycles += this.pageCrossedCycles({branchCycles, addr});
        store = (val) => this.w8(val, addr);
        break;
      case MODE.ACC:
        src = this.a;
        store = (val) => this.a = val;
        break;
      case MODE.IMM:
        src = this.r8(next);
        break;
      case MODE.IMP:
        break; // Nothing to do here.
      case MODE.IDX_IND:
        addr = this.r16(this.r8(next) + this.x);
        src = this.r8(addr);
        store = (val) => this.w8(val, addr);
        break;
      case MODE.IND:
        addr = this.r16(this.r16(next));
        break;
      case MODE.IND_IDX:
        addr = this.r16(this.r8(next)) + this.y;
        src = this.r8(addr);
        totalCycles += this.pageCrossedCycles({branchCycles, addr});
        store = (val) => this.w8(val, addr);
        break;
      case MODE.REL:
        src = this.r8(next).signed();
        break;
      case MODE.ZERO_PAGE:
        addr = this.r8(next);
        src = this.r8(addr);
        store = (val) => this.w8(val, addr);
        break;
      case MODE.ZERO_PAGE_X:
        addr = (this.r8(next) + this.x) & 0xff;
        src = this.r8(addr);
        store = (val) => this.w8(val, addr);
        break;
      case MODE.ZERO_PAGE_Y:
        addr = (this.r8(next) + this.y) & 0xff;
        src = this.r8(addr);
        store = (val) => this.w8(val, addr);
        break;
      default:
        throw new Error('Unknown addressing mode');
    }

    this.pc = (this.pc + bytes) & 0xffff;
    this.t += totalCycles;

    execute({...inst, cpu: this, addr, src, store});
  }
};
