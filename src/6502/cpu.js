import {debug as Debug} from 'debug';
import instSet from './instruction-set';
import * as FLAG from './status-flags';
import * as MODE from './address-mode';
import * as INT from './interrupts';

const debug = Debug('nes:cpu');
const interrupt = Debug('nes:cpu:int');
const stack = Debug('nes:cpu:stack');

export default class Cpu {
  mmu = null;

  a = 0;
  x = 0;
  y = 0;
  stat = 0;
  pc = 0;
  sp = 0;
  cycles = 0;
  // TODO(nakardo): update flag behavior with this:
  // - https://wiki.nesdev.com/w/index.php/CPU_status_flag_behavior
  // - also revisit instructions listed.
  irq = false;
  nmi = false;

  constructor(mmu) {
    this.mmu = mmu;
  }

  push8(val) {
    val &= 0xff;
    const addr = 0x100 | this.sp;
    stack('push to: %s, val: %s', addr.to(16, 2), val.to(16));
    this.mmu.w8({val, addr});
    this.sp = --this.sp & 0xff;
  }

  push16(val) {
    this.push8(val >> 8);
    this.push8(val);
  }

  pull8() {
    this.sp = ++this.sp & 0xff;
    const addr = 0x100 | this.sp;
    const val = this.mmu.r8(addr);
    stack('pull from: %s, val: %s', addr.to(16, 2), val.to(16));
    return val;
  }

  pull16() {
    return this.pull8() | (this.pull8() << 8);
  }

  sign(val) {
    if (val !== undefined) {
      if ((val & 0x80) > 0) this.stat |= FLAG.SIGN;
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
      if ((val & 0xff) == 0) this.stat |= FLAG.ZERO;
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

  reset() {
    const addr = this.mmu.r16(INT.RESET_ADDR);
    debug('reset addr: %s', addr.to(16, 2));
    this.pc = addr;
  }

  step() {
    this.cycles = 0;
    this.handleInterrupts();
    this.runCycle();
  }

  handleInterrupts() {
    if (!this.nmi || !this.interrupt()) return;

    let vector;
    if (this.nmi) {
      vector = INT.NMI_ADDR;
      this.nmi = false;
    } else if (this.irq) {
      vector = INT.IRQ_BRK_ADDR;
      this.irq = false;
    } else if (this.break()) {
      vector = INT.IRQ_BRK_ADDR;
      this.break(false);
    }

    this.push16(this.pc);
    this.push8(this.stat);
    this.interrupt(false);
    this.pc = this.mmu.r16(vector);
    this.cycles += 7;

    interrupt('pc: %s', this.pc.to(16));
  }

  decode() {
    const opcode = this.mmu.r8(this.pc);
    debug('pc: %s, opcode: %s', this.pc.to(16, 2), opcode.to(16));
    return instSet[opcode];
  }

  pageCrossedCycles({branchCycles, addr}) {
    return (this.pc & 0xff00) != (addr & 0xff00) ? branchCycles : 0;
  }

  runCycle() {
    const inst = this.decode();
    const {mode, bytes, cycles, branchCycles, execute} = inst;
    const operand = this.pc + 1;

    let addr;
    let totalCycles = cycles;
    switch (mode) {
      case MODE.ACC:
      case MODE.IMP:
        break;
      case MODE.REL:
      case MODE.IMM:
        addr = operand;
        break;
      case MODE.ABS:
        addr = this.mmu.r16(operand);
        break;
      case MODE.ABS_X:
        addr = this.mmu.r16(operand) + this.x;
        totalCycles += this.pageCrossedCycles({branchCycles, addr});
        break;
      case MODE.ABS_Y:
        addr = this.mmu.r16(operand) + this.y;
        totalCycles += this.pageCrossedCycles({branchCycles, addr});
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
        const laddr = this.mmu.r16(operand);
        const haddr = (laddr & 0xff00) | ((laddr + 1) & 0xff);
        addr = this.mmu.r8(laddr) | (this.mmu.r8(haddr) << 8);
        break;
      }
      case MODE.IDX_IND: {
        const laddr = (this.mmu.r8(operand) + this.x) & 0xff;
        const haddr = (laddr + 1) & 0xff;
        addr = this.mmu.r8(laddr) | (this.mmu.r8(haddr) << 8);
        break;
      }
      case MODE.IND_IDX: {
        const laddr = this.mmu.r8(operand);
        const haddr = (laddr + 1) & 0xff;
        addr = (this.mmu.r8(laddr) | (this.mmu.r8(haddr) << 8)) + this.y;
        totalCycles += this.pageCrossedCycles({branchCycles, addr});
        break;
      }
      case MODE.ZERO_PAGE:
        addr = this.mmu.r8(operand);
        break;
      case MODE.ZERO_PAGE_X:
        addr = (this.mmu.r8(operand) + this.x) & 0xff;
        break;
      case MODE.ZERO_PAGE_Y:
        addr = (this.mmu.r8(operand) + this.y) & 0xff;
        break;
      default:
        throw new Error('Unknown addressing mode');
    }

    this.pc = (this.pc + bytes) & 0xffff;
    this.cycles += totalCycles;
    execute({...inst, cpu: this, mmu: this.mmu, addr, operand});
  }
}
