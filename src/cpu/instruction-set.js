// prettier-ignore
import {
  // official
  adc, and, asl, bcc, bcs, beq, bit, bmi, bne, bpl, brk, bvc, bvs, clc, cld,
  cli, clv, cmp, cpx, cpy, dec, dex, dey, eor, inc, inx, iny, jmp, jsr, lda,
  ldx, ldy, lsr, nop, ora, pha, php, pla, plp, rol, ror, rti, rts, sbc, sec,
  sed, sei, sta, stx, sty, tax, tay, tsx, txa, txs, tya,
  // unofficial
  anc, sax, arr, alr, ahx, axs, dcp, isc, stp, las, lax, rla, rra, slo, sre,
  shx, shy, xaa, tas
} from './instructions';

// prettier-ignore
const execute = [
  brk, ora, stp, slo, nop, ora, asl, slo, php, ora, asl, anc, nop, ora, asl, slo,
  bpl, ora, stp, slo, nop, ora, asl, slo, clc, ora, nop, slo, nop, ora, asl, slo,
  jsr, and, stp, rla, bit, and, rol, rla, plp, and, rol, anc, bit, and, rol, rla,
  bmi, and, stp, rla, nop, and, rol, rla, sec, and, nop, rla, nop, and, rol, rla,
  rti, eor, stp, sre, nop, eor, lsr, sre, pha, eor, lsr, alr, jmp, eor, lsr, sre,
  bvc, eor, stp, sre, nop, eor, lsr, sre, cli, eor, nop, sre, nop, eor, lsr, sre,
  rts, adc, stp, rra, nop, adc, ror, rra, pla, adc, ror, arr, jmp, adc, ror, rra,
  bvs, adc, stp, rra, nop, adc, ror, rra, sei, adc, nop, rra, nop, adc, ror, rra,
  nop, sta, nop, sax, sty, sta, stx, sax, dey, nop, txa, xaa, sty, sta, stx, sax,
  bcc, sta, stp, ahx, sty, sta, stx, sax, tya, sta, txs, tas, shy, sta, shx, ahx,
  ldy, lda, ldx, lax, ldy, lda, ldx, lax, tay, lda, tax, lax, ldy, lda, ldx, lax,
  bcs, lda, stp, lax, ldy, lda, ldx, lax, clv, lda, tsx, las, ldy, lda, ldx, lax,
  cpy, cmp, nop, dcp, cpy, cmp, dec, dcp, iny, cmp, dex, axs, cpy, cmp, dec, dcp,
  bne, cmp, stp, dcp, nop, cmp, dec, dcp, cld, cmp, nop, dcp, nop, cmp, dec, dcp,
  cpx, sbc, nop, isc, cpx, sbc, inc, isc, inx, sbc, nop, sbc, cpx, sbc, inc, isc,
  beq, sbc, stp, isc, nop, sbc, inc, isc, sed, sbc, nop, isc, nop, sbc, inc, isc,
];

// prettier-ignore
const mode = [
  6,  7, 6, 7, 11, 11, 11, 11, 6, 5, 4, 5, 1, 1, 1, 1,
  10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2,
  1,  7, 6, 7, 11, 11, 11, 11, 6, 5, 4, 5, 1, 1, 1, 1,
  10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2,
  6,  7, 6, 7, 11, 11, 11, 11, 6, 5, 4, 5, 1, 1, 1, 1,
  10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2,
  6,  7, 6, 7, 11, 11, 11, 11, 6, 5, 4, 5, 8, 1, 1, 1,
  10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2,
  5,  7, 5, 7, 11, 11, 11, 11, 6, 5, 6, 5, 1, 1, 1, 1,
  10, 9, 6, 9, 12, 12, 13, 13, 6, 3, 6, 3, 2, 2, 3, 3,
  5,  7, 5, 7, 11, 11, 11, 11, 6, 5, 6, 5, 1, 1, 1, 1,
  10, 9, 6, 9, 12, 12, 13, 13, 6, 3, 6, 3, 2, 2, 3, 3,
  5,  7, 5, 7, 11, 11, 11, 11, 6, 5, 6, 5, 1, 1, 1, 1,
  10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2,
  5,  7, 5, 7, 11, 11, 11, 11, 6, 5, 6, 5, 1, 1, 1, 1,
  10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2,
];

// prettier-ignore
const bytes = [
  2, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3,
  2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3,
  3, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3,
  2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3,
  1, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3,
  2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3,
  1, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3,
  2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3,
  2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3,
  2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3,
  2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3,
  2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3,
];

// prettier-ignore
const cycles = [
  7, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 4, 4, 6, 6,
  2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 4, 4, 6, 6,
  2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  6, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 3, 4, 6, 6,
  2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 5, 4, 6, 6,
  2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,
  2, 6, 2, 6, 4, 4, 4, 4, 2, 5, 2, 5, 5, 5, 5, 5,
  2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4,
  2, 5, 2, 5, 4, 4, 4, 4, 2, 4, 2, 4, 4, 4, 4, 4,
  2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,
  2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
  2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6,
  2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7,
];

// prettier-ignore
const branchCycles = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0,
];

// prettier-ignore
const mnemonic = [
  'BRK', 'ORA', 'KIL', 'SLO', 'NOP', 'ORA', 'ASL', 'SLO', 'PHP', 'ORA', 'ASL', 'ANC', 'NOP', 'ORA', 'ASL', 'SLO',
  'BPL', 'ORA', 'KIL', 'SLO', 'NOP', 'ORA', 'ASL', 'SLO', 'CLC', 'ORA', 'NOP', 'SLO', 'NOP', 'ORA', 'ASL', 'SLO',
  'JSR', 'AND', 'KIL', 'RLA', 'BIT', 'AND', 'ROL', 'RLA', 'PLP', 'AND', 'ROL', 'ANC', 'BIT', 'AND', 'ROL', 'RLA',
  'BMI', 'AND', 'KIL', 'RLA', 'NOP', 'AND', 'ROL', 'RLA', 'SEC', 'AND', 'NOP', 'RLA', 'NOP', 'AND', 'ROL', 'RLA',
  'RTI', 'EOR', 'KIL', 'SRE', 'NOP', 'EOR', 'LSR', 'SRE', 'PHA', 'EOR', 'LSR', 'ALR', 'JMP', 'EOR', 'LSR', 'SRE',
  'BVC', 'EOR', 'KIL', 'SRE', 'NOP', 'EOR', 'LSR', 'SRE', 'CLI', 'EOR', 'NOP', 'SRE', 'NOP', 'EOR', 'LSR', 'SRE',
  'RTS', 'ADC', 'KIL', 'RRA', 'NOP', 'ADC', 'ROR', 'RRA', 'PLA', 'ADC', 'ROR', 'ARR', 'JMP', 'ADC', 'ROR', 'RRA',
  'BVS', 'ADC', 'KIL', 'RRA', 'NOP', 'ADC', 'ROR', 'RRA', 'SEI', 'ADC', 'NOP', 'RRA', 'NOP', 'ADC', 'ROR', 'RRA',
  'NOP', 'STA', 'NOP', 'SAX', 'STY', 'STA', 'STX', 'SAX', 'DEY', 'NOP', 'TXA', 'XAA', 'STY', 'STA', 'STX', 'SAX',
  'BCC', 'STA', 'KIL', 'AHX', 'STY', 'STA', 'STX', 'SAX', 'TYA', 'STA', 'TXS', 'TAS', 'SHY', 'STA', 'SHX', 'AHX',
  'LDY', 'LDA', 'LDX', 'LAX', 'LDY', 'LDA', 'LDX', 'LAX', 'TAY', 'LDA', 'TAX', 'LAX', 'LDY', 'LDA', 'LDX', 'LAX',
  'BCS', 'LDA', 'KIL', 'LAX', 'LDY', 'LDA', 'LDX', 'LAX', 'CLV', 'LDA', 'TSX', 'LAS', 'LDY', 'LDA', 'LDX', 'LAX',
  'CPY', 'CMP', 'NOP', 'DCP', 'CPY', 'CMP', 'DEC', 'DCP', 'INY', 'CMP', 'DEX', 'AXS', 'CPY', 'CMP', 'DEC', 'DCP',
  'BNE', 'CMP', 'KIL', 'DCP', 'NOP', 'CMP', 'DEC', 'DCP', 'CLD', 'CMP', 'NOP', 'DCP', 'NOP', 'CMP', 'DEC', 'DCP',
  'CPX', 'SBC', 'NOP', 'ISC', 'CPX', 'SBC', 'INC', 'ISC', 'INX', 'SBC', 'NOP', 'SBC', 'CPX', 'SBC', 'INC', 'ISC',
  'BEQ', 'SBC', 'KIL', 'ISC', 'NOP', 'SBC', 'INC', 'ISC', 'SED', 'SBC', 'NOP', 'ISC', 'NOP', 'SBC', 'INC', 'ISC',
]

export default new Array(0x100).fill(null).map((_, i) => ({
  execute: execute[i],
  mode: mode[i],
  bytes: bytes[i],
  cycles: cycles[i],
  branchCycles: branchCycles[i],
  mnemonic: mnemonic[i],
}));
