'use strict';

const fs = require('fs');
const debug = require('debug')('nes');
const raf = require('raf');

function unk() {
  throw new Error('Unknown instruction');
}

function branch({cpu, src}, cond) {
  if (cond) {
    cpu.t += (cpu.pc & 0xff00 != (cpu.pc + src) & 0xff00) ? 2 : 1;
    cpu.pc = (cpu.pc + src) & 0xffff;
  }
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
  const carry = cpu.carry() ? 1 : 0;
  let temp = src + cpu.a + carry;
  cpu.zero(temp & 0xff);
  if (cpu.decimal()) {
    if (((cpu.a & 0xf) + (src & 0xf) + carry) > 9) {
      temp += 6;
    }
    cpu.sign(temp);
    cpu.overflow(!((cpu.a ^ src) & 0x80) && ((cpu.a ^ temp) & 0x80));
    if (temp > 0x99) {
      temp += 96;
    }
    cpu.carry(temp > 0x99);
  } else {
    cpu.sign(temp);
    cpu.overflow(!((cpu.a ^ src) & 0x80) && ((cpu.a ^ temp) & 0x80));
    cpu.carry(temp > 0xff);
  }
  cpu.a = temp & 0xff;
}

/**
 * AND                  "AND" memory with accumulator                    AND
 *
 * Operation:  A /\ M -> A                               N Z C I D V
 *                                                       / / _ _ _ _
 *                              (Ref: 2.2.3.0)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   AND #Oper           |    29   |    2    |    2     |
 * |  Zero Page     |   AND Oper            |    25   |    2    |    3     |
 * |  Zero Page,X   |   AND Oper,X          |    35   |    2    |    4     |
 * |  Absolute      |   AND Oper            |    2D   |    3    |    4     |
 * |  Absolute,X    |   AND Oper,X          |    3D   |    3    |    4*    |
 * |  Absolute,Y    |   AND Oper,Y          |    39   |    3    |    4*    |
 * |  (Indirect,X)  |   AND (Oper,X)        |    21   |    2    |    6     |
 * |  (Indirect,Y)  |   AND (Oper),Y        |    31   |    2    |    5     |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if page boundary is crossed.
 */
function and({cpu, src}) {
  src &= cpu.a;
  cpu.sign(src);
  cpu.zero(src);
  cpu.a = src;
}

/**
 * ASL          ASL Shift Left One Bit (Memory or Accumulator)           ASL
 *                  +-+-+-+-+-+-+-+-+
 * Operation:  C <- |7|6|5|4|3|2|1|0| <- 0
 *                  +-+-+-+-+-+-+-+-+                    N Z C I D V
 *                                                       / / / _ _ _
 *                                (Ref: 10.2)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Accumulator   |   ASL A               |    0A   |    1    |    2     |
 * |  Zero Page     |   ASL Oper            |    06   |    2    |    5     |
 * |  Zero Page,X   |   ASL Oper,X          |    16   |    2    |    6     |
 * |  Absolute      |   ASL Oper            |    0E   |    3    |    6     |
 * |  Absolute, X   |   ASL Oper,X          |    1E   |    3    |    7     |
 * +----------------+-----------------------+---------+---------+----------+
 */
function asl({cpu, src, store}) {
  cpu.carry(src & 0x80);
  src <<= 1;
  src &= 0xff;
  cpu.sign(src);
  cpu.zero(src);
  store(src);
}

/**
 * BCC                     BCC Branch on Carry Clear                     BCC
 *                                                       N Z C I D V
 * Operation:  Branch on C = 0                           _ _ _ _ _ _
 *                              (Ref: 4.1.1.3)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Relative      |   BCC Oper            |    90   |    2    |    2*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if branch occurs to same page.
 * * Add 2 if branch occurs to different page.
 */
const bcc = ({cpu, src}) => branch({cpu, src}, !cpu.carry());

/**
 * BCS                      BCS Branch on carry set                      BCS
 *
 * Operation:  Branch on C = 1                           N Z C I D V
 *                                                       _ _ _ _ _ _
 *                              (Ref: 4.1.1.4)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Relative      |   BCS Oper            |    B0   |    2    |    2*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if branch occurs to same  page.
 * * Add 2 if branch occurs to next  page.
 */
const bcs = ({cpu, src}) => branch({cpu, src}, cpu.carry());

/**
 * BEQ                    BEQ Branch on result zero                      BEQ
 *                                                       N Z C I D V
 * Operation:  Branch on Z = 1                           _ _ _ _ _ _
 *                              (Ref: 4.1.1.5)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Relative      |   BEQ Oper            |    F0   |    2    |    2*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if branch occurs to same  page.
 * * Add 2 if branch occurs to next  page.
 */
const beq = ({cpu, src}) => branch({cpu, src}, cpu.zero());

/**
 * BIT             BIT Test bits in memory with accumulator              BIT
 *
 * Operation:  A /\ M, M7 -> N, M6 -> V
 *
 * Bit 6 and 7 are transferred to the status register.   N Z C I D V
 * If the result of A /\ M is zero then Z = 1, otherwise M7/ _ _ _ M6
 * Z = 0
 *                              (Ref: 4.2.1.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Zero Page     |   BIT Oper            |    24   |    2    |    3     |
 * |  Absolute      |   BIT Oper            |    2C   |    3    |    4     |
 * +----------------+-----------------------+---------+---------+----------+
 */
function bit({cpu, src}) {
  cpu.sign(src);
  cpu.overflow(0x40 & src);
  cpu.zero(src & cpu.a);
}

/**
 * BMI                    BMI Branch on result minus                     BMI
 *
 * Operation:  Branch on N = 1                           N Z C I D V
 *                                                       _ _ _ _ _ _
 *                              (Ref: 4.1.1.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Relative      |   BMI Oper            |    30   |    2    |    2*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if branch occurs to same page.
 * * Add 1 if branch occurs to different page.
 */
const bmi = ({cpu, src}) => branch({cpu, src}, cpu.sign());

/**
 * BNE                   BNE Branch on result not zero                   BNE
 *
 * Operation:  Branch on Z = 0                           N Z C I D V
 *                                                       _ _ _ _ _ _
 *                              (Ref: 4.1.1.6)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Relative      |   BMI Oper            |    D0   |    2    |    2*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if branch occurs to same page.
 * * Add 2 if branch occurs to different page.
 */
const bne = ({cpu, src}) => branch({cpu, src}, !cpu.zero());

/**
 * BPL                     BPL Branch on result plus                     BPL
 *
 * Operation:  Branch on N = 0                           N Z C I D V
 *                                                       _ _ _ _ _ _
 *                              (Ref: 4.1.1.2)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Relative      |   BPL Oper            |    10   |    2    |    2*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if branch occurs to same page.
 * * Add 2 if branch occurs to different page.
 */
const bpl = ({cpu, src}) => branch({cpu, src}, !cpu.sign());

/**
 * BRK                          BRK Force Break                          BRK
 *
 * Operation:  Forced Interrupt PC + 2 toS P toS         N Z C I D V
 *                                                       _ _ _ 1 _ _
 *                                (Ref: 9.11)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   BRK                 |    00   |    1    |    7     |
 * +----------------+-----------------------+---------+---------+----------+
 * 1. A BRK command cannot be masked by setting I.
 */
function brk({cpu, mmu, src}) {
  const addr = cpu.pc + 1;
  cpu.push(addr);
  cpu.break(true);
  cpu.push(cpu.stat);
  cpu.interrupt(true);
  cpu.pc = mmu.readWord(0xfffe);
}

/**
 * BVC                   BVC Branch on overflow clear                    BVC
 *
 * Operation:  Branch on V = 0                           N Z C I D V
 *                                                       _ _ _ _ _ _
 *                              (Ref: 4.1.1.8)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Relative      |   BVC Oper            |    50   |    2    |    2*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if branch occurs to same page.
 * * Add 2 if branch occurs to different page.
 */
const bvc = ({cpu, src}) => branch({cpu, src}, !cpu.overflow());

/**
 * BVS                    BVS Branch on overflow set                     BVS
 *
 * Operation:  Branch on V = 1                           N Z C I D V
 *                                                       _ _ _ _ _ _
 *                              (Ref: 4.1.1.7)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Relative      |   BVS Oper            |    70   |    2    |    2*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if branch occurs to same page.
 * * Add 2 if branch occurs to different page.
 */
const bvs = ({cpu, src}) => branch({cpu, src}, cpu.overflow());

const clc = ({cpu}) => cpu.carry(false);
const cld = ({cpu}) => cpu.decimal(false);
const cli = ({cpu}) => cpu.interrupt(false);
const clv = ({cpu}) => cpu.overflow(false);

function compare({cpu, src}, value) {
  src = value - src;
  cpu.carry(src < 0x100);
  cpu.sign(src);
  cpu.zero(src &= 0xff);
}

const cmp = ({cpu, src}) => compare({cpu, src}, cpu.a);
const cpx = ({cpu, src}) => compare({cpu, src}, cpu.x);
const cpy = ({cpu, src}) => compare({cpu, src}, cpu.y);

function decrement({cpu, src}) {
  src = (src - 1) & 0xff;
  cpu.sign(src);
  cpu.zero(src);
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
  cpu.sign(src);
  cpu.zero(src);
  cpu.a = src;
}

function increment({cpu, src}) {
  src = (src + 1) & 0xff;
  cpu.sign(src);
  cpu.zero(src);
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
  cpu.sign(src);
  cpu.zero(src);
  cpu[key] = src;
}

const lda = (...args) => load(...args, 'a');
const ldx = (...args) => load(...args, 'x');
const ldy = (...args) => load(...args, 'y');

function lsr({cpu, src, store}) {
  cpu.carry(src & 0x01);
  src >>= 1;
  cpu.sign(src);
  cpu.zero(src);
  store(src);
}

function nop() {};

function ora({cpu, src}) {
  src |= cpu.a;
  cpu.sign(src);
  cpu.zero(src);
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
  cpu.sign(val);
  cpu.zero(val);
}

function plp({cpu}) {
  cpu.stat = cpu.pull();
}

function rol({cpu, src, store}) {
  src <<= 1;
  if (cpu.carry()) src |= 0x1;
  cpu.carry(src > 0xff);
  src &= 0xff;
  cpu.sign(src);
  cpu.zero(src);
  store(src);
}

function ror({cpu, src, store}) {
  if (cpu.carry()) src |= 0x100;
  cpu.carry(src & 0x01);
  src >>= 1;
  cpu.sign(src);
  cpu.zero(src);
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
  const carry = cpu.carry() ? 0 : 1;
  let temp = cpu.a - src - carry;
  cpu.sign(temp);
  cpu.zero(temp & 0xff);
  cpu.overflow(((cpu.a ^ temp) & 0x80) && ((cpu.a ^ src) & 0x80));
  if (cpu.decimal()) {
    if (((cpu.a & 0xf) - carry) < (src & 0xf)) {
      temp -= 6;
    }
    if (temp > 0x99) {
      temp -= 0x60;
    }
  }
  cpu.carry(temp < 0x100);
  cpu.a = (temp & 0xff);
}

const sec = ({cpu}) => cpu.carry(true);
const sed = ({cpu}) => cpu.decimal(true);
const sei = ({cpu}) => cpu.interrupt(true);

const sta = ({cpu, store}) => store(cpu.a);
const stx = ({cpu, store}) => store(cpu.x);
const sty = ({cpu, store}) => store(cpu.y);

const transfer = function ({cpu}, from, to) {
  const src = cpu[from];
  cpu.sign(src);
  cpu.zero(src);
  cpu[to] = src;
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

/**
 * Memory Map
 * ----------
 * +---------+-------+-------+-----------------------+
 * | Address | Size  | Flags | Description           |
 * +---------+-------+-------+-----------------------+
 * | $0000   | $800  |       | RAM                   |
 * | $0800   | $800  | M     | RAM                   |
 * | $1000   | $800  | M     | RAM                   |
 * | $1800   | $800  | M     | RAM                   |
 * | $2000   | 8     |       | Registers             |
 * | $2008   | $1FF8 |  R    | Registers             |
 * | $4000   | $20   |       | Registers             |
 * | $4020   | $1FDF |       | Expansion ROM         |
 * | $6000   | $2000 |       | SRAM                  |
 * | $8000   | $4000 |       | PRG-ROM               |
 * | $C000   | $4000 |       | PRG-ROM               |
 * +---------+-------+-------+-----------------------+
 *        Flag Legend: M = Mirror of $0000
 *                     R = Mirror of $2000-2008 every 8 bytes
 *                         (e.g. $2008=$2000, $2018=$2000, etc.)
 */
const mmu = {
  ram: new Uint8Array(0x800),
  registers: new Uint8Array(8),
  exrom: new Uint8Array(0x1fdf),
  sram: new Uint8Array(0x2000),
  prgrom: null,
  loadCart: function(data) {
    mmu.prgrom = Uint8Array.from(data).slice(0, 0x8000);
  },
  readByte: function(addr) {
    addr &= 0xffff;
    switch (addr >> 12) {
      case 0x0: case 0x1:
        return this.ram[addr & 0x7ff];
      case 0x2: case 0x3:
        return this.registers[addr & 7];
      case 0x4:
        addr &= 0x1fff;
        if (addr < 0x20) {
          // TODO(nakardo) unimplemented: more registers.
          break;
        }
        return exrom[addr - 0x20];
      case 0x5: case 0x6:
        return sram[addr & 0x4fff];
      case 0x8: case 0x9:
      case 0xa: case 0xb:
      case 0xc: case 0xd:
      case 0xe: case 0xf:
        console.log(`${(addr & 0x7fff).toString(16)}, ${this.prgrom[addr & 0x7fff].toString(16)}`);
        return this.prgrom[addr & 0x7fff];
      default: break;
    }
    throw new Error(`Invalid address: 0x${addr.toString(16)}`);
  },
  readWord: function(addr) {
    return this.readByte(addr) | this.readByte(++addr) << 8;
  },
  writeByte: function(val, addr) {
    addr &= 0xffff;
    switch (addr >> 12) {
      case 0x0: case 0x1:
        return this.ram[addr & 0x7ff] = val;
      default: break;
    }
    throw new Error(`Invalid address: 0x${addr.toString(16)}`);
  },
  writeWord: function(val, addr) {
    throw new Error('unimplemented');
    // this.writeByte(addr, val);
    // this.writeByte(++addr, val >> 8) << 8;
  },
};

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

const cpu = {
  a: 0,
  x: 0,
  y: 0,
  stat: 0,
  pc: 0,
  sp: 0,
  t: 0,
  irq: false,
  reset: false,
  push: function(val) {
    debug(`push value: 0x${val.toString(16)} at: 0x${this.sp.toString(16)}`);
    mmu.writeByte(val, this.sp);
  },
  sign: function(val) {
    if (val !== undefined) {
      if (val & FLAG_SIGN) this.stat |= FLAG_SIGN;
      else this.stat &= ~FLAG_SIGN;
    }
    return !!(this.stat & FLAG_SIGN);
  },
  overflow: function(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG_OVERFLOW;
      else this.stat &= ~FLAG_OVERFLOW;
    }
    return !!(this.stat & FLAG_OVERFLOW);
  },
  break: function(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG_BREAK;
      else this.stat &= ~FLAG_BREAK;
    }
    return !!(this.stat & FLAG_BREAK);
  },
  decimal: function(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG_DECIMAL;
      else this.stat &= ~FLAG_DECIMAL;
    }
    return !!(this.stat & FLAG_DECIMAL);
  },
  interrupt: function(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG_INTERRUPT;
      else this.stat &= ~FLAG_INTERRUPT;
    }
    return !!(this.stat & FLAG_INTERRUPT);
  },
  zero: function(val) {
    if (val !== undefined) {
      if (val == 0) this.stat |= FLAG_ZERO;
      else this.stat &= ~FLAG_ZERO;
    }
    return !!(this.stat & FLAG_ZERO);
  },
  carry: function(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= FLAG_CARRY;
      else this.stat &= ~FLAG_CARRY;
    }
    return !!(this.stat & FLAG_CARRY);
  },
  start: function() {
    debug('start');
    const tick = () => {
      this.step();
      this.loop = raf(tick);
    };
    this.reset = true;
    this.loop = raf(tick);
  },
  step: function() {
    this.t = 0;
    while (this.t < MAX_FRAME_CYCLES) {
      this.handleInterrupts();
      this.runCycle();
    }
  },
  runCycle: function() {
    const {mode, exec, size, cycles, branchCycles} = inst;
    const opcode = mmu.readByte(this.pc);
    const next = this.pc + 1;

    debug(`pc: 0x${this.pc.toString(16)}, opcode: 0x${opcode.toString(16)}`);

    let src, store;
    let totalCycles = cycles[opcode];
    switch (mode[opcode]) {
      case MODE_IMM:
        src = mmu.readByte(next);
        break;
      case MODE_ABS:
        src = mmu.readByte(mmu.readWord(next));
        store = (val) => mmu.writeByte(val, next);
        break;
      case MODE_ZERO_PAGE:
        src = mmu.readByte(mmu.readByte(next));
        store = (val) => mmu.writeByte(val, next);
        break;
      case MODE_IMP:
        break; // Nothing to do here.
      case MODE_ACC:
        src = this.a;
        store = function(val) { this.a = val; };
        break;
      case MODE_ABS_X:
        src = mmu.readWord(next) + this.x;
        store = (val) => mmu.writeByte(val, src);
        break;
      case MODE_ABS_Y:
        src = mmu.readWord(next) + this.y;
        store = (val) => mmu.writeByte(val, src);
        break;
      case MODE_ZERO_PAGE_X:
        src = mmu.readByte(next) + this.x;
        store = (val) => mmu.writeByte(val, src);
        break;
      case MODE_ZERO_PAGE_Y:
        src = mmu.readByte(next) + this.y;
        store = (val) => mmu.writeByte(val, src);
        break;
      case MODE_IND:
        src = mmu.readWord(mmu.readWord(next));
        break;
      case MODE_IDX_IND: {
        const addr = mmu.readWord(mmu.readByte(next) + this.x);
        src = mmu.readByte(addr);
        store = (val) => mmu.writeWord(val, addr);
        break;
      }
      case MODE_IND_IDX: {
        const addr = mmu.readWord(mmu.readByte(next)) + this.y;
        src = mmu.readByte(addr);
        store = (val) => mmu.writeWord(val, addr);
        break;
      }
      case MODE_REL: {
        const byte = mmu.readByte(next);
        src = byte & 0x80 ? -((0xff & ~byte) + 1) : byte;
        store = (val) => mmu.writeByte(val, src);
        break;
      }
      default: throw new Error('Unknown addressing mode');
    }
    exec[opcode]({cpu: this, mmu, src, store});

    // this.pc += size[opcode];
    this.t += totalCycles;
  },
  handleInterrupts: function() {
    if (!(this.irq | this.reset | this.interrupt())) {
      return;
    }

    let addr;
    if (this.reset) {
      addr = INT_RESET_ADDR;
      this.reset = false;
    } else if (this.irq || this.break()) {
      addr = INT_IRQ_BRK_ADDR;
      this.irq = false;
      this.break(false);
    }
    this.interrupt(false);

    this.pc = addr;
    this.t += 7;
  },
};

mmu.loadCart(fs.readFileSync('./roms/tetris.nes'));
cpu.start();
