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
  const carry = cpu.flag.carry() ? 1 : 0;
  let temp = src + cpu.a + carry;
  cpu.flag.zero(temp & 0xff);
  if (cpu.flag.decimal()) {
    if (((cpu.a & 0xf) + (src & 0xf) + carry) > 9) {
      temp += 6;
    }
    cpu.flag.sign(temp);
    cpu.flag.overflow(!((cpu.a ^ src) & 0x80) && ((cpu.a ^ temp) & 0x80));
    if (temp > 0x99) {
      temp += 96;
    }
    cpu.flag.carry(temp > 0x99);
  } else {
    cpu.flag.sign(temp);
    cpu.flag.overflow(!((cpu.a ^ src) & 0x80) && ((cpu.a ^ temp) & 0x80));
    cpu.flag.carry(temp > 0xff);
  }
  cpu.a = temp & 0xff;
}

function and({cpu, src}) {
  src &= cpu.a;
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  cpu.a = src;
}

function asl({cpu, src, store}) {
  cpu.flag.carry(src & 0x80);
  src <<= 1;
  src &= 0xff;
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  store(src);
}

function branch({cpu, src}, cond) {
  if (cond) {
    const diff = cpu.pc & 0xff00 != (cpu.pc + src) & 0xff00;
    cpu.t += diff ? 2 : 1;
    cpu.pc = (cpu.pc + src) & 0xffff;
  }
}

const bcs = ({cpu, src}) => branch({cpu, src}, cpu.flag.carry());
const beq = ({cpu, src}) => branch({cpu, src}, cpu.flag.zero());
const bmi = ({cpu, src}) => branch({cpu, src}, cpu.flag.sign());

const bcc = ({cpu, src}) => branch({cpu, src}, !cpu.flag.carry());
const bne = ({cpu, src}) => branch({cpu, src}, !cpu.flag.zero());
const bpl = ({cpu, src}) => branch({cpu, src}, !cpu.flag.sign());

const bvc = ({cpu, src}) => branch({cpu, src}, !cpu.flag.overflow());
const bvs = ({cpu, src}) => branch({cpu, src}, cpu.flag.overflow());

function bit({cpu, src}) {
  cpu.flag.sign(src);
  cpu.flag.overflow(0x40 & src);
  cpu.flag.zero(src & cpu.a);
}

function brk({cpu, mmu, src}) {
  cpu.pc++;
  cpu.push(cpu.pc);
  cpu.flag.break(true);
  cpu.push(cpu.stat);
  cpu.flag.interrupt(true);
  cpu.pc = mmu.readWord(0xfffe);
}

const clc = ({cpu}) => cpu.flag.carry(false);
const cld = ({cpu}) => cpu.flag.decimal(false);
const cli = ({cpu}) => cpu.flag.interrupt(false);
const clv = ({cpu}) => cpu.flag.overflow(false);

function compare({cpu, src}, value) {
  src = value - src;
  cpu.flag.carry(src < 0x100);
  cpu.flag.sign(src);
  cpu.flag.zero(src &= 0xff);
}

const cmp = ({cpu, src}) => compare({cpu, src}, cpu.a);
const cpx = ({cpu, src}) => compare({cpu, src}, cpu.x);
const cpy = ({cpu, src}) => compare({cpu, src}, cpu.y);

function decrement({cpu, src}) {
  src = (src - 1) & 0xff;
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  return src;
}

function decrementIx({cpu, src}, reg) {
  cpu[reg] = decrement({cpu, src}, cpu[reg]);
}

function dec({cpu, src, store}) {
  store(decrement({cpu, src}));
}

const dex = (...args) => decrementIx(...args, 'x');
const dey = (...args) => decrementIx(...args, 'y');

function eor({cpu, src}) {
  src ^= cpu.a;
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  cpu.a = src;
}

function increment({cpu, src}) {
  src = (src + 1) & 0xff;
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  return src;
}

function incrementIx({cpu, src}, reg) {
  cpu[reg] = increment({cpu, src}, cpu[reg]);
}

function inc({cpu, src, store}) {
  store(increment({cpu, src}));
}

const inx = (...args) => incrementIx(...args, 'x');
const iny = (...args) => incrementIx(...args, 'y');

function jmp({cpu, src}) {
  cpu.pc = src;
}

function jsr({cpu, src}) {
  cpu.pc--;
  cpu.push(cpu.pc);
  cpu.pc = src;
}

function load({cpu, src}, key) {
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  cpu[key] = src;
}

const lda = (...args) => load(...args, 'a');
const ldx = (...args) => load(...args, 'x');
const ldy = (...args) => load(...args, 'y');

function lsr({cpu, src, store}) {
  cpu.flag.carry(src & 0x01);
  src >>= 1;
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  store(src);
}

function nop() {};

function ora({cpu, src}) {
  src |= cpu.a;
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  cpu.a = src;
}

function pha({cpu}) {
  cpu.push(cpu.a);
}

function php({cpu}) {
  cpu.push(cpu.stat);
}

function pla({cpu}) {
  const val = cpu.pull();
  cpu.flag.sign(val);
  cpu.flag.zero(val);
}

function plp({cpu}) {
  cpu.stat = cpu.pull();
}

function rol({cpu, src, store}) {
  src <<= 1;
  if (cpu.flag.carry()) src |= 0x1;
  cpu.flag.carry(src > 0xff);
  src &= 0xff;
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  store(src);
}

function ror({cpu, src, store}) {
  if (cpu.flag.carry()) src |= 0x100;
  cpu.flag.carry(src & 0x01);
  src >>= 1;
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  store(src);
}

function rti({cpu}) {
  cpu.stat = cpu.pull();
  cpu.pc = cpu.pull() | (cpu.pull() << 8);
}

function rts({cpu}) {
  cpu.pc = (cpu.pull() | (cpu.pull() << 8)) + 1;
}

function sbc({cpu, src}) {
  const carry = cpu.flag.carry() ? 0 : 1;
  let temp = cpu.a - src - carry;
  cpu.flag.sign(temp);
  cpu.flag.zero(temp & 0xff);
  cpu.flag.overflow(((cpu.a ^ temp) & 0x80) && ((cpu.a ^ src) & 0x80));
  if (cpu.flag.decimal()) {
    if (((cpu.a & 0xf) - carry) < (src & 0xf)) {
      temp -= 6;
    }
    if (temp > 0x99) {
      temp -= 0x60;
    }
  }
  cpu.flag.carry(temp < 0x100);
  cpu.a = (temp & 0xff);
}

const sec = ({cpu}) => cpu.flag.carry(true);
const sed = ({cpu}) => cpu.flag.decimal(true);
const sei = ({cpu}) => cpu.flag.interrupt(true);

const sta = ({cpu, store}) => store(cpu.a);
const stx = ({cpu, store}) => store(cpu.x);
const sty = ({cpu, store}) => store(cpu.y);

const transfer = function ({cpu}, from, to) {
  const src = cpu[from];
  cpu.flag.sign(src);
  cpu.flag.zero(src);
  cpu[to] = src;
}

const tax = (...args) => transfer(...args, 'a', 'x');
const tay = (...args) => transfer(...args, 'a', 'y');
const txa = (...args) => transfer(...args, 'x', 'a');
const tya = (...args) => transfer(...args, 'y', 'a');
const tsx = (...args) => transfer(...args, 'sp', 'x');
const txs = (...args) => transfer(...args, 'x', 'sp');

const instSet = {
  fn: [
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
  size: [
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
  ram: new Uint8Array(0x800),
  rom: new Uint8Array(fs.readFileSync('./roms/mario.nes'), 0, 0x4000),
  readByte: (addr) => {
    return mmu.rom[addr & 0xffff];
  },
  readWord: (addr) => {
    return mmu.readByte(addr) | mmu.readByte(++addr) << 8;
  },
  writeByte: (val, addr) => {
    return mmu.rom[addr & 0xffff] = val;
  },
  writeWord: (val, addr) => {
    return mmu.writeByte(addr, val) | mmu.writeByte(++addr, val >> 8) << 8;
  },
};

const FLAG_SIGN           = 1 << 7;
const FLAG_OVERFLOW       = 1 << 6;
const FLAG_BREAK          = 1 << 4;
const FLAG_DECIMAL        = 1 << 3;
const FLAG_INTERRUPT      = 1 << 2;
const FLAG_ZERO           = 1 << 1;
const FLAG_CARRY          = 1;

const MODE_IMM            = 1;
const MODE_ABS            = 2;
const MODE_ZEROPAGE_ABS   = 3;
const MODE_IMP            = 4;
const MODE_ACC            = 5;
const MODE_IDX_X          = 6;
const MODE_IDX_Y          = 7;
const MODE_ZEROPAGE_IDX_X = 8;
const MODE_ZEROPAGE_IDX_Y = 9;
const MODE_IND            = 10;
const MODE_PREIDX_X_IND   = 11;
const MODE_POSTIDX_Y_IND  = 12;
const MODE_REL            = 13;

const cpu = {
  a: 0,
  x: 0,
  y: 0,
  stat: 0,
  pc: 0,
  sp: 0,
  t: 0,
  flag: {
    sign: (val) => {
      if (val !== undefined) {
        if (val & FLAG_SIGN) cpu.stat |= FLAG_SIGN;
        else cpu.stat &= ~FLAG_SIGN;
      }
      return !!(cpu.stat & FLAG_SIGN);
    },
    overflow: (cond) => {
      if (cond !== undefined) {
        if (cond) cpu.stat |= FLAG_OVERFLOW;
        else cpu.stat &= ~FLAG_OVERFLOW;
      }
      return !!(cpu.stat & FLAG_OVERFLOW);
    },
    break: (cond) => {
      if (cond !== undefined) {
        if (cond) cpu.stat |= FLAG_BREAK;
        else cpu.stat &= ~FLAG_BREAK;
      }
      return !!(cpu.stat & FLAG_BREAK);
    },
    decimal: (cond) => {
      if (cond !== undefined) {
        if (cond) cpu.stat |= FLAG_DECIMAL;
        else cpu.stat &= ~FLAG_DECIMAL;
      }
      return !!(cpu.stat & FLAG_DECIMAL);
    },
    interrupt: (cond) => {
      if (cond !== undefined) {
        if (cond) cpu.stat |= FLAG_INTERRUPT;
        else cpu.stat &= ~FLAG_INTERRUPT;
      }
      return !!(cpu.stat & FLAG_INTERRUPT);
    },
    zero: (val) => {
      if (val !== undefined) {
        if (val == 0) cpu.stat |= FLAG_ZERO;
        else cpu.stat &= ~FLAG_ZERO;
      }
      return !!(cpu.stat & FLAG_ZERO);
    },
    carry: (cond) => {
      if (cond !== undefined) {
        if (cond) cpu.stat |= FLAG_CARRY;
        else cpu.stat &= ~FLAG_CARRY;
      }
      return !!(cpu.stat & FLAG_CARRY);
    },
  },
  push: (src) => {
    console.log(`push: 0x${src.toString(16)}`);
  },
  tick: () => {
    const opcode = mmu.readByte(cpu.pc);
    const next = cpu.pc + 1;

    let src, store;
    switch (instSet.mode[opcode]) {
      case MODE_IMM:
        src = mmu.readByte(next);
        store = (val) => mmu.writeByte(val, next);
        break;
      case MODE_ABS:
        src = mmu.readWord(next);
        store = (val) => mmu.writeWord(val, next);
        break;
      case MODE_ZEROPAGE_ABS:
        src = mmu.readByte(next);
        store = (val) => mmu.writeByte(val, next);
        break;
      case MODE_IMP:
        break; // Nothing to do here.
      case MODE_ACC:
        src = cpu.a;
        store = (val) => { cpu.a = val; };
        break;
      case MODE_IDX_X:
        src = mmu.readWord(next) + cpu.x;
        store = (val) => mmu.writeByte(val, src);
        break;
      case MODE_IDX_Y:
        src = mmu.readWord(next) + cpu.y;
        store = (val) => mmu.writeWord(val, src);
        break;
      case MODE_ZEROPAGE_IDX_X:
        src = mmu.readByte(next) + cpu.x;
        store = (val) => mmu.writeByte(val, src);
        break;
      case MODE_ZEROPAGE_IDX_Y:
        src = mmu.readByte(next) + cpu.y;
        store = (val) => mmu.writeByte(val, src);
        break;
      case MODE_IND:
        src = mmu.readWord(mmu.readWord(next));
        store = (val) => mmu.writeWord(val, src);
        break;
      case MODE_PREIDX_X_IND:
        src = mmu.readWord(mmu.readByte(next + cpu.x));
        store = (val) => mmu.writeWord(val, src);
        break;
      case MODE_POSTIDX_Y_IND:
        src = mmu.readWord(mmu.readByte(next)) + cpu.y;
        store = (val) => mmu.writeWord(val, src);
        break;
      case MODE_REL: {
        const byte = mmu.readByte(next);
        src = byte & 0x80 ? -((0xff & ~byte) + 1) : byte;
        store = (val) => mmu.writeByte(val, src);
        break;
      }
      default: break;
    }

    console.log(cpu.pc, opcode.toString(16));

    instSet.fn[opcode]({cpu, mmu, src, store});
    cpu.pc += instSet.size[opcode];
  },
};

setInterval(() => cpu.tick(), 1 / 500);
