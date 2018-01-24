'use strict';

const fs = require('fs');

function unk() {
  throw new Error('Unknown instruction');
}

/**
 * ADC               Add memory to accumulator with carry                ADC
 *
 * Operation:  A + M + C -> A, C                         N Z C I D V
 *                                                       / / / _ _ /
 *                               (Ref: 2.2.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   ADC #Oper           |    69   |    2    |    2     |
 * |  Zero Page     |   ADC Oper            |    65   |    2    |    3     |
 * |  Zero Page,X   |   ADC Oper,X          |    75   |    2    |    4     |
 * |  Absolute      |   ADC Oper            |    6D   |    3    |    4     |
 * |  Absolute,X    |   ADC Oper,X          |    7D   |    3    |    4*    |
 * |  Absolute,Y    |   ADC Oper,Y          |    79   |    3    |    4*    |
 * |  (Indirect,X)  |   ADC (Oper,X)        |    61   |    2    |    6     |
 * |  (Indirect),Y  |   ADC (Oper),Y        |    71   |    2    |    5*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if page boundary is crossed.
 */
function adc({cpu, src}) {
  const carry = cpu.flags.carry() ? 1 : 0;
  let temp = src + cpu.reg.a + carry;
  cpu.flags.zero(temp & 0xff);
  if (cpu.flags.decimal()) {
    if (((cpu.reg.a & 0xf) + (src & 0xf) + carry) > 9) {
      temp += 6;
    }
    cpu.flags.sign(temp);
    cpu.flags.overflow(!((cpu.reg.a ^ src) & 0x80) && ((cpu.reg.a ^ temp) & 0x80));
    if (temp > 0x99) {
      temp += 96;
    }
    cpu.flags.carry(temp > 0x99);
  } else {
    cpu.flags.sign(temp);
    cpu.flags.overflow(!((cpu.reg.a ^ src) & 0x80) && ((cpu.reg.a ^ temp) & 0x80));
    cpu.flags.carry(temp > 0xff);
  }
  cpu.reg.a = temp & 0xff;
}

function and({cpu, src}) {
  src &= cpu.reg.a;
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  cpu.reg.a = src;
}

function asl({cpu, src}, store) {
  cpu.flags.carry(src & 0x80);
  src <<= 1;
  src &= 0xff;
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  store(src); // src in memory or accumulator depending on addressing mode.
}

function branch({cpu, src}, condition) {
  if (condition) {
    const diff = cpu.reg.pc & 0xff00 != (cpu.reg.pc + src) & 0xff00;
    cpu.reg.t += diff ? 2 : 1;
    cpu.reg.pc = (cpu.reg.pc + src) & 0xffff;
  }
}

const bcs = (...args) => branch(...args, cpu.flags.carry());
const beq = (...args) => branch(...args, cpu.flags.zero());
const bmi = (...args) => branch(...args, cpu.flags.sign());

const bcc = (...args) => branch(...args, !cpu.flags.carry());
const bne = (...args) => branch(...args, !cpu.flags.zero());
const bpl = (...args) => branch(...args, !cpu.flags.sign());

const bvc = (...args) => branch(...args, !cpu.flags.overflow());
const bvs = (...args) => branch(...args, cpu.flags.overflow());

function bit({cpu, src}) {
  cpu.flags.sign(src);
  cpu.flags.overflow(0x40 & src); // Copy bit 6 to OVERFLOW flag.
  cpu.flags.zero(src & cpu.reg.a);
}

function brk({cpu, mmu, src}) {
  cpu.reg.pc++;
  cpu.push(cpu.reg.pc);
  cpu.flags.break(true); // Set BFlag before pushing.
  cpu.push(cpu.reg.stat);
  cpu.flags.interrupt(true);
  cpu.reg.pc = mmu.readWord(0xfffe);
}

const clear = function(flag) {
  flag(false);
};

const clc = ({cpu}) => clear(cpu.flags.carry);
const cld = ({cpu}) => clear(cpu.flags.decimal);
const cli = ({cpu}) => clear(cpu.flags.interrupt);
const clv = ({cpu}) => clear(cpu.flags.overflow);

function compare({cpu, src}, value) {
  src = value - src;
  cpu.flags.carry(src < 0x100);
  cpu.flags.sign(src);
  cpu.flags.zero(src &= 0xff);
}

const cmp = (...args) => compare(...args, cpu.reg.a);
const cpx = (...args) => compare(...args, cpu.reg.x);
const cpy = (...args) => compare(...args, cpu.reg.y);

function decrement({cpu, src}) {
  src = (src - 1) & 0xff;
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  return src;
}

function decrementRef({cpu, src}, ref) {
  cpu.reg[ref] = decrement({cpu, src}, cpu.reg[ref]);
}

function dec({cpu, src}, store) {
  store(decrement({cpu, src}));
}

const dex = (...args) => decrementRef(...args, 'x');
const dey = (...args) => decrementRef(...args, 'y');

function eor({cpu, src}) {
  src ^= cpu.reg.a;
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  cpu.reg.a = src;
}

function increment({cpu, src}) {
  src = (src + 1) & 0xff;
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  return src;
}

function incrementRef({cpu, src}, ref) {
  cpu.reg[ref] = increment({cpu, src}, cpu.reg[ref]);
}

function inc({cpu, src}, store) {
  store(increment(...args));
}

const inx = (...args) => incrementRef(...args, 'x');
const iny = (...args) => incrementRef(...args, 'y');

function jmp({cpu, src}) {
  cpu.regs.pc = src;
}

function jsr({cpu, src}) {
  cpu.regs.pc--;
  cpu.push(cpu.regs.pc); // Push return address onto the stack.
  cpu.regs.pc = src;
}

function load({cpu, src}, ref) {
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  cpu.reg[ref] = src;
}

const lda = (...args) => load(...args, 'a');
const ldx = (...args) => load(...args, 'x');
const ldy = (...args) => load(...args, 'y');

function lsr({cpu, src}, store) {
  cpu.flags.carry(src & 0x01);
  src >>= 1;
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  store(src); // src in memory or accumulator depending on addressing mode.
}

function nop() {};

function ora({cpu, src}) {
  src |= cpu.regs.a;
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  cpu.regs.a = src;
}

function pha({cpu}) {
  cpu.push(cpu.regs.a);
}

function php({cpu}) {
  cpu.push(cpu.regs.stat);
}

function pla({cpu}) {
  const src = cpu.pull();
  cpu.flags.sign(src); // Change sign and zero flag accordingly.
  cpu.flags.zero(src);
}

function plp({cpu, src}) {
  cpu.regs.stat = cpu.pull();
}

function rol({cpu, src}) {
  src <<= 1;
  if (cpu.flags.carry()) src |= 0x1;
  cpu.flags.carry(src > 0xff);
  src &= 0xff;
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  store(src); // src in memory or accumulator depending on addressing mode.
}

function ror({cpu, src}) {
  if (cpu.flags.carry()) src |= 0x100;
  cpu.flags.carry(src & 0x01);
  src >>= 1;
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  store(src); // src in memory or accumulator depending on addressing mode.
}

function rti({cpu, src}) {
  cpu.reg.stat = cpu.pull();
  cpu.pc = cpu.pull(); // Load return address from stack.
}

function rts({cpu, src}) {
  cpu.pc = cpu.pull(); // Load return address from stack and add 1.
}

function sbc({cpu, src}) {
  const carry = cpu.flags.carry() ? 0 : 1;
  let temp = cpu.reg.a - src - carry;
  cpu.flags.sign(temp);
  cpu.flags.zero(temp & 0xff); // Sign and Zero are invalid in decimal mode.
  cpu.flags.overflow(((cpu.reg.a ^ temp) & 0x80) && ((cpu.reg.a ^ src) & 0x80));
  if (cpu.flags.decimal()) {
    if (((cpu.reg.a & 0xf) - carry) < (src & 0xf)) { // EP
      temp -= 6;
    }
    if (temp > 0x99) {
      temp -= 0x60;
    }
  }
  cpu.flags.carry(temp < 0x100);
  cpu.reg.a = (temp & 0xff);
}

const set = function(flag) {
  flag(true);
};

const sec = ({cpu}) => set(cpu.flags.carry);
const sed = ({cpu}) => set(cpu.flags.decimal);
const sei = ({cpu}) => set(cpu.flags.interrupt);

const store = function({src}, store) {
  store(address, src)
}

const sta = (...args) => store(...args);
const stx = (...args) => store(...args);
const sty = (...args) => store(...args);

const transfer = function ({cpu}, from, to) {
  const src = cpu.reg[from];
  cpu.flags.sign(src);
  cpu.flags.zero(src);
  cpu.reg[to] = src;
}

const tax = (...args) => transfer(...args, 'a', 'x');
const tay = (...args) => transfer(...args, 'a', 'y');
const txa = (...args) => transfer(...args, 'x', 'a');
const tya = (...args) => transfer(...args, 'y', 'a');
const tsx = (...args) => transfer(...args, 'sp', 'x');
const txs = (...args) => transfer(...args, 'x', 'sp');

const inst = {
  exec: [
    /*       00   01   02   03   04   05   06   07   08   09   0A   0B   0C   0D   0E   0F   */
    /* 00 */ brk, ora, unk, unk, unk, ora, asl, unk, php, ora, asl, unk, unk, ora, asl, unk,
    /* 10 */ bpl, ora, unk, unk, unk, ora, asl, unk, clc, ora, unk, unk, unk, ora, asl, unk,
    /* 20 */ jsr, and, unk, unk, bit, and, rol, unk, plp, and, rol, unk, bit, and, rol, unk,
    /* 30 */ bmi, and, unk, unk, unk, and, rol, unk, sec, and, unk, unk, unk, and, rol, unk,
    /* 40 */ rti, eor, unk, unk, unk, eor, lsr, unk, pha, eor, lsr, unk, jmp, eor, lsr, unk,
    /* 50 */ bvc, eor, unk, unk, unk, eor, lsr, unk, cli, eor, unk, unk, unk, eor, lsr, unk,
    /* 60 */ rts, adc, unk, unk, unk, adc, ror, unk, pla, adc, ror, unk, jmp, adc, ror, unk,
    /* 70 */ bvs, adc, unk, unk, unk, adc, ror, unk, sei, adc, unk, unk, unk, adc, ror, unk,
    /* 80 */ unk, sta, unk, unk, sty, sta, stx, unk, dey, unk, txa, unk, sty, sta, stx, unk,
    /* 90 */ bcc, sta, unk, unk, sty, sta, stx, unk, tya, sta, txs, unk, unk, sta, unk, unk,
    /* A0 */ ldy, lda, ldx, unk, ldy, lda, ldx, unk, tay, lda, tax, unk, ldy, lda, ldx, unk,
    /* B0 */ bcs, lda, unk, unk, ldy, lda, ldx, unk, clv, lda, tsx, unk, ldy, lda, ldx, unk,
    /* C0 */ cpy, cmp, unk, unk, cpy, cmp, dec, unk, iny, cmp, dex, unk, cpy, cmp, dec, unk,
    /* D0 */ bne, cmp, unk, unk, unk, cmp, dec, unk, cld, cmp, unk, unk, unk, cmp, dec, unk,
    /* E0 */ cpx, sbc, unk, unk, cpx, sbc, inc, unk, inx, sbc, nop, unk, cpx, sbc, inc, unk,
    /* F0 */ beq, sbc, unk, unk, unk, sbc, inc, unk, sed, sbc, unk, unk, unk, sbc, inc, unk,
  ],
  mode: [
    /*       00  01  02  03  04  05  06  07  08  09  0A  0B  0C  0D  0E  0F */
    /* 00 */ 6,  7,  6,  7,  11, 11, 11, 11, 6,  5,  4,  5,  1,  1,  1,  1,
    /* 10 */ 10, 9,  6,  9,  12, 12, 12, 12, 6,  3,  6,  3,  2,  2,  2,  2,
    /* 20 */ 1,  7,  6,  7,  11, 11, 11, 11, 6,  5,  4,  5,  1,  1,  1,  1,
    /* 30 */ 10, 9,  6,  9,  12, 12, 12, 12, 6,  3,  6,  3,  2,  2,  2,  2,
    /* 40 */ 6,  7,  6,  7,  11, 11, 11, 11, 6,  5,  4,  5,  1,  1,  1,  1,
    /* 50 */ 10, 9,  6,  9,  12, 12, 12, 12, 6,  3,  6,  3,  2,  2,  2,  2,
    /* 60 */ 6,  7,  6,  7,  11, 11, 11, 11, 6,  5,  4,  5,  8,  1,  1,  1,
    /* 70 */ 10, 9,  6,  9,  12, 12, 12, 12, 6,  3,  6,  3,  2,  2,  2,  2,
    /* 80 */ 5,  7,  5,  7,  11, 11, 11, 11, 6,  5,  6,  5,  1,  1,  1,  1,
    /* 90 */ 10, 9,  6,  9,  12, 12, 13, 13, 6,  3,  6,  3,  2,  2,  3,  3,
    /* A0 */ 5,  7,  5,  7,  11, 11, 11, 11, 6,  5,  6,  5,  1,  1,  1,  1,
    /* B0 */ 10, 9,  6,  9,  12, 12, 13, 13, 6,  3,  6,  3,  2,  2,  3,  3,
    /* C0 */ 5,  7,  5,  7,  11, 11, 11, 11, 6,  5,  6,  5,  1,  1,  1,  1,
    /* D0 */ 10, 9,  6,  9,  12, 12, 12, 12, 6,  3,  6,  3,  2,  2,  2,  2,
    /* E0 */ 5,  7,  5,  7,  11, 11, 11, 11, 6,  5,  6,  5,  1,  1,  1,  1,
    /* F0 */ 10, 9,  6,  9,  12, 12, 12, 12, 6,  3,  6,  3,  2,  2,  2,  2,
  ],
  bytes: [
    /*       00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F */
    /* 00 */ 1, 2, 0, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
    /* 10 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
    /* 20 */ 3, 2, 0, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
    /* 30 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
    /* 40 */ 1, 2, 0, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
    /* 50 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
    /* 60 */ 1, 2, 0, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
    /* 70 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
    /* 80 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 0, 1, 0, 3, 3, 3, 0,
    /* 90 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 0, 3, 0, 0,
    /* A0 */ 2, 2, 2, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
    /* B0 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
    /* C0 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
    /* D0 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
    /* E0 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 2, 1, 0, 3, 3, 3, 0,
    /* F0 */ 2, 2, 0, 0, 2, 2, 2, 0, 1, 3, 1, 0, 3, 3, 3, 0,
  ],
  cycles: [
    /*       00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F */
    /* 00 */ 7, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 4, 4, 6, 6,
    /* 10 */ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
    /* 20 */ 6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 4, 4, 6, 6,
    /* 30 */ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
    /* 40 */ 6, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 3, 4, 6, 6,
    /* 50 */ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
    /* 60 */ 6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 5, 4, 6, 6,
    /* 70 */ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
    /* 80 */ 2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,
    /* 90 */ 2, 6, 2, 6, 4, 4, 4, 4, 2, 5, 2, 5, 5, 5, 5, 5,
    /* A0 */ 2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,
    /* B0 */ 2, 5, 2, 5, 4, 4, 4, 4, 2, 4, 2, 4, 4, 4, 4, 4,
    /* C0 */ 2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,
    /* D0 */ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
    /* E0 */ 2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,
    /* F0 */ 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  ],
  branchCycles: [
    /*       00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F */
    /* 00 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    /* 10 */ 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
    /* 20 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    /* 30 */ 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
    /* 40 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    /* 50 */ 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
    /* 60 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    /* 70 */ 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
    /* 80 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    /* 90 */ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    /* A0 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    /* B0 */ 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1,
    /* C0 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    /* D0 */ 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
    /* E0 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    /* F0 */ 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
  ],
};

const mmu = {
  memory: new Uint8Array(),
  readByte: function(addr) {
    return this.memory[addr & 0xffff];
  },
  readWord: function(addr) {
    return this.readByte(addr) | this.readByte(++addr) << 8;
  },
};

const cpu = {
  reg: {
    a: 0,
    x: 0,
    y: 0,
    stat: 0,
    pc: 0,
    sp: 0,
    t: 0,
    flags: {
      s: false,
      v: false,
      b: false,
      d: false,
      i: false,
      z: false,
      c: false,
    },
  },
  flags: {
    sign: function(val) {
      if (val !== undefined) cpu.reg.flags.s = val & 7 > 0;
      return cpu.reg.flags.s;
    },
    overflow: function(val) {
      if (val !== undefined) cpu.reg.flags.v = val == true;
      return cpu.reg.flags.v;
    },
    break: function(val) {
      if (val !== undefined) cpu.reg.flags.b = val == true;
      return cpu.reg.flags.b;
    },
    decimal: function(val) {
      if (val !== undefined) cpu.reg.flags.d = val == true;
      return cpu.reg.flags.d;
    },
    interrupt: function(val) {
      if (val !== undefined) cpu.reg.flags.i = val == true;
      return cpu.reg.flags.i;
    },
    zero: function(val) {
      if (val !== undefined) cpu.reg.flags.z = val == 0;
      return cpu.reg.flags.z;
    },
    carry: function(val) {
      if (val !== undefined) cpu.reg.flags.c = val > 0;
      return cpu.reg.flags.c;
    },
  },
  push: function(src) {
    console.log(`push: 0x${src.toString(16)}`);
  },
  store: function(src) {
    console.log(`store: 0x${src.toString(16)}`);
  },
  tick: function() {
    const opcode = mmu.readByte(this.reg.pc);
    let operand;
    switch (inst.mode[opcode]) {
      case 0: // Accumulator
        operand = cpu.reg.a;
        break;
      case 1: // Immediate
        operand = mmu.readByte(cpu.reg.pc + 1);
        break;
      case 2: { // Relative
        let byte = mmu.readByte(cpu.reg.pc + 1);
        operand = byte & 0x80 ? -((0xff & ~byte) + 1) : byte;
        break;
      }
      case 3: // Absolute
        operand = mmu.readWord(cpu.reg.pc + 1);
        break;
      case 4: // Zero-Page
        operand = mmu.readByte(cpu.reg.pc + 1);
        break;
      case 5: // Indirect
        operand = mmu.readWord(mmu.readWord(cpu.reg.pc + 1));
        break;
      case 6: // Absolute Indexed
        // X or Y
        break;
      case 7: // Zero-Page Indexed
        // Same as above
        break;
    }
    inst.exec[opcode]({cpu: this, mmu}, this.store);
    console.log(cpu.reg.pc);
    cpu.reg.pc += inst.cycles[opcode];
  },
};

fs.readFile('./roms/mario.nes', (err, data) => {
  mmu.memory = new Uint8Array(data, 0, 0x10000);
  setInterval(() => cpu.tick(), 1 / 500);
});
