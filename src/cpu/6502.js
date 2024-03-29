import {debug as Debug} from 'debug';
import instSet from './instruction-set';
import * as FLAG from './status-flags';
import * as MODE from './address-mode';
import * as INT from './interrupts';

const debug = Debug('nes:cpu');
const interrupt = Debug('nes:cpu:int');
const stack = Debug('nes:cpu:stack');

export default class MOS6502 {
  mem = null;

  a = 0;
  x = 0;
  y = 0;
  stat = 0;
  pc = 0;
  sp = 0;
  cycles = 0;
  haltCycles = 0;
  irq = false;
  nmi = false;
  brk = false;

  opcode = 0;
  operand = 0;
  branchCycles = 0;

  constructor(mem) {
    this.mem = mem;
    Object.seal(this);
  }

  push8(val) {
    val &= 0xff;
    const addr = 0x100 | this.sp;
    stack('push to: %s, val: %s', addr.to(16, 2), val.to(16));
    this.mem.w8(val, addr);
    this.sp = --this.sp & 0xff;
  }

  push16(val) {
    this.push8(val >> 8);
    this.push8(val);
  }

  pull8() {
    this.sp = ++this.sp & 0xff;
    const addr = 0x100 | this.sp;
    const val = this.mem.r8(addr);
    stack('pull from: %s, val: %s', addr.to(16, 2), val.to(16));
    return val;
  }

  pull16() {
    return this.pull8() | (this.pull8() << 8);
  }

  carry(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG.CARRY;
      else this.stat &= ~FLAG.CARRY;
    }
    return !!(this.stat & FLAG.CARRY);
  }

  zero(val) {
    if (val !== undefined) {
      if ((val & 0xff) == 0) this.stat |= FLAG.ZERO;
      else this.stat &= ~FLAG.ZERO;
    }
    return !!(this.stat & FLAG.ZERO);
  }

  interrupt(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG.INTERRUPT;
      else this.stat &= ~FLAG.INTERRUPT;
    }
    return !!(this.stat & FLAG.INTERRUPT);
  }

  decimal(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG.DECIMAL;
      else this.stat &= ~FLAG.DECIMAL;
    }
    return !!(this.stat & FLAG.DECIMAL);
  }

  overflow(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG.OVERFLOW;
      else this.stat &= ~FLAG.OVERFLOW;
    }
    return !!(this.stat & FLAG.OVERFLOW);
  }

  sign(val) {
    if (val !== undefined) {
      if ((val & 0x80) > 0) this.stat |= FLAG.SIGN;
      else this.stat &= ~FLAG.SIGN;
    }
    return !!(this.stat & FLAG.SIGN);
  }

  reset() {
    const addr = this.mem.r16(INT.RESET_ADDR);
    debug('reset addr: %s', addr.to(16, 2));
    this.pc = addr;
    this.sp = 0x1ff;
  }

  step() {
    this.cycles = 0;
    this.handleInterrupts();
    if (this.haltCycles == 0) {
      this.runCycle();
      return this.cycles;
    } else {
      this.haltCycles--;
      return 1;
    }
  }

  handleInterrupts() {
    let status = this.stat;

    let vector;
    if (this.nmi) {
      vector = INT.NMI_ADDR;
      status = (status | (1 << 5)) & ~(1 << 4);
      this.nmi = false;
    } else if (this.irq && !this.interrupt()) {
      vector = INT.IRQ_BRK_ADDR;
      status = (status | (1 << 5)) & ~(1 << 4);
      this.irq = false;
      this.interrupt(true);
    } else if (this.brk) {
      vector = INT.IRQ_BRK_ADDR;
      status |= 0b110000; // Set bits 5 and 4.
      this.brk = false;
      this.interrupt(true);
    } else {
      return;
    }

    this.push16(this.pc);
    this.push8(status);
    this.pc = this.mem.r16(vector);
    this.cycles += 7;

    interrupt('pc: %s', this.pc.to(16));
  }

  pageCrossedCycles(addr) {
    return (this.pc & 0xff00) != (addr & 0xff00) ? this.branchCycles : 0;
  }

  runCycle() {
    const opcode = this.mem.r8(this.pc);
    const inst = instSet[opcode];

    this.opcode = opcode;
    this.operand = this.pc + 1;
    this.branchCycles = inst.branchCycles;

    debug(
      'pc: %s, op: %s[%s]',
      this.pc.to(16, 2),
      this.opcode.to(16),
      inst.mnemonic,
    );

    let addr;
    let totalCycles = inst.cycles;
    switch (inst.mode) {
      case MODE.ACC:
      case MODE.IMP:
        break;
      case MODE.REL:
      case MODE.IMM:
        addr = this.operand;
        break;
      case MODE.ABS:
        addr = this.mem.r16(this.operand);
        break;
      case MODE.ABS_X:
        addr = this.mem.r16(this.operand) + this.x;
        totalCycles += this.pageCrossedCycles(addr);
        break;
      case MODE.ABS_Y:
        addr = this.mem.r16(this.operand) + this.y;
        totalCycles += this.pageCrossedCycles(addr);
        break;
      /**
       * JMP transfers program execution to the following address (absolute)
       * or to the location contained in the following address (indirect).
       * Note that there is no carry associated with the indirect jump so:
       *
       * AN INDIRECT JUMP MUST NEVER USE A VECTOR BEGINNING ON THE LAST BYTE
       * OF A PAGE
       *
       * For example if address $3000 contains $40, $30FF contains $80,
       * and $3100 contains $50, the result of JMP ($30FF) will be a transfer
       * of control to $4080 rather than $5080 as you intended i.e. the 6502
       * took the low byte of the address from $30FF and the high byte from
       * $3000.
       */
      case MODE.IND: {
        const laddr = this.mem.r16(this.operand);
        const haddr = (laddr & 0xff00) | ((laddr + 1) & 0xff);
        addr = this.mem.r8(laddr) | (this.mem.r8(haddr) << 8);
        break;
      }
      case MODE.IDX_IND: {
        const laddr = (this.mem.r8(this.operand) + this.x) & 0xff;
        const haddr = (laddr + 1) & 0xff;
        addr = this.mem.r8(laddr) | (this.mem.r8(haddr) << 8);
        break;
      }
      case MODE.IND_IDX: {
        const laddr = this.mem.r8(this.operand);
        const haddr = (laddr + 1) & 0xff;
        addr = (this.mem.r8(laddr) | (this.mem.r8(haddr) << 8)) + this.y;
        totalCycles += this.pageCrossedCycles(addr);
        break;
      }
      case MODE.ZERO_PAGE:
        addr = this.mem.r8(this.operand);
        break;
      case MODE.ZERO_PAGE_X:
        addr = (this.mem.r8(this.operand) + this.x) & 0xff;
        break;
      case MODE.ZERO_PAGE_Y:
        addr = (this.mem.r8(this.operand) + this.y) & 0xff;
        break;
      default:
        throw new Error('Unknown addressing mode');
    }

    this.pc = (this.pc + inst.bytes) & 0xffff;
    this.cycles += totalCycles;
    inst.execute(this, this.mem, addr);
  }
}

export {default as Memory} from './memory';
