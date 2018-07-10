function branch({branchCycles, cpu, mmu, addr}, cond) {
  if (cond) {
    const next = cpu.pc + mmu.r8(addr).signed();
    cpu.t += cpu.pageCrossedCycles({branchCycles, addr: next});
    cpu.pc = next & 0xffff;
  }
}

function compare({cpu, mmu, addr}, val) {
  const src = val - mmu.r8(addr);
  cpu.carry(src < 0x100);
  cpu.sign(src);
  cpu.zero(src & 0xff);
}

function load({cpu, mmu, addr}) {
  const src = mmu.r8(addr);
  cpu.sign(src);
  cpu.zero(src);
  return src;
}

const transfer = ({from, to}) => function transfer({cpu}) {
  const src = cpu[from];
  cpu.sign(src);
  cpu.zero(src);
  cpu[to] = src;
};

const combine = (...fns) => function combine(...args) {
  [...fns].forEach((fn) => fn(...args));
}

// Official opcodes

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
export function adc({cpu, mmu, addr}) {
  const carry = cpu.carry() ? 1 : 0;
  const src = mmu.r8(addr);
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
export function and({cpu, mmu, addr}) {
  const src = mmu.r8(addr) & cpu.a;
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
export function asl({opcode, cpu, mmu, addr}) {
  const execute = (src) => {
    cpu.carry(src & 0x80);
    src = (src << 1) & 0xff;
    cpu.sign(src);
    cpu.zero(src);
    return src;
  };

  if (opcode === 0x0a) {
    cpu.a = execute(cpu.a);
  } else {
    const src = execute(mmu.r8(addr));
    mmu.w8(src, addr);
  }
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
export function bcc(...args) {
  const {cpu} = args[0];
  branch(...args, !cpu.carry());
}

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
 * * Add 1 if branch occurs to same page.
 * * Add 2 if branch occurs to next page.
 */
export function bcs(...args) {
  const {cpu} = args[0];
  branch(...args, cpu.carry());
}

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
 * * Add 1 if branch occurs to same page.
 * * Add 2 if branch occurs to next page.
 */
export function beq(...args) {
  const {cpu} = args[0];
  branch(...args, cpu.zero());
}

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
export function bit({cpu, mmu, addr}) {
  const src = mmu.r8(addr);
  cpu.sign(src);
  cpu.overflow(src & 0x40);
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
export function bmi(...args) {
  const {cpu} = args[0];
  branch(...args, cpu.sign());
}

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
export function bne(...args) {
  const {cpu} = args[0];
  branch(...args, !cpu.zero());
}

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
export function bpl(...args) {
  const {cpu} = args[0];
  branch(...args, !cpu.sign());
}

/**
 * BRK                          BRK Force Break                          BRK
 *
 * Operation:  Forced Interrupt PC + 2 to SP             N Z C I D V
 *                                                       _ _ _ 1 _ _
 *                                (Ref: 9.11)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   BRK                 |    00   |    1    |    7     |
 * +----------------+-----------------------+---------+---------+----------+
 * 1. A BRK command cannot be masked by setting I.
 */
export function brk({cpu}) {
  cpu.push16(cpu.pc + 1);
  cpu.break(true);
  cpu.push8(cpu.stat);
  cpu.interrupt(true);
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
export function bvc(...args) {
  const {cpu} = args[0];
  branch(...args, !cpu.overflow());
}

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
export function bvs(...args) {
  const {cpu} = args[0];
  branch(...args, cpu.overflow());
}

/**
 * CLC                       CLC Clear carry flag                        CLC
 *
 * Operation:  0 -> C                                    N Z C I D V
 *                                                       _ _ 0 _ _ _
 *                               (Ref: 3.0.2)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   CLC                 |    18   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function clc({cpu}) {
  cpu.carry(false);
}

/**
 * CLD                      CLD Clear decimal mode                       CLD
 *
 * Operation:  0 -> D                                    N A C I D V
 *                                                       _ _ _ _ 0 _
 *                               (Ref: 3.3.2)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   CLD                 |    D8   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function cld({cpu}) {
  cpu.decimal(false);
}

/**
 * CLI                  CLI Clear interrupt disable bit                  CLI
 *
 * Operation: 0 -> I                                     N Z C I D V
 *                                                       _ _ _ 0 _ _
 *                               (Ref: 3.2.2)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   CLI                 |    58   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function cli({cpu}) {
  cpu.interrupt(false);
}

/**
 * CLV                      CLV Clear overflow flag                      CLV
 *
 * Operation: 0 -> V                                     N Z C I D V
 *                                                       _ _ _ _ _ 0
 *                               (Ref: 3.6.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   CLV                 |    B8   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function clv({cpu}) {
  cpu.overflow(false);
}

/**
 * CMP                CMP Compare memory and accumulator                 CMP
 *
 * Operation:  A - M                                     N Z C I D V
 *                                                       / / / _ _ _
 *                               (Ref: 4.2.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   CMP #Oper           |    C9   |    2    |    2     |
 * |  Zero Page     |   CMP Oper            |    C5   |    2    |    3     |
 * |  Zero Page,X   |   CMP Oper,X          |    D5   |    2    |    4     |
 * |  Absolute      |   CMP Oper            |    CD   |    3    |    4     |
 * |  Absolute,X    |   CMP Oper,X          |    DD   |    3    |    4*    |
 * |  Absolute,Y    |   CMP Oper,Y          |    D9   |    3    |    4*    |
 * |  (Indirect,X)  |   CMP (Oper,X)        |    C1   |    2    |    6     |
 * |  (Indirect),Y  |   CMP (Oper),Y        |    D1   |    2    |    5*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if page boundary is crossed.
 */
export function cmp(...args) {
  const {cpu} = args[0];
  compare(...args, cpu.a);
}

/**
 * CPX                  CPX Compare Memory and Index X                   CPX
 *                                                       N Z C I D V
 * Operation:  X - M                                     / / / _ _ _
 *                                (Ref: 7.8)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   CPX *Oper           |    E0   |    2    |    2     |
 * |  Zero Page     |   CPX Oper            |    E4   |    2    |    3     |
 * |  Absolute      |   CPX Oper            |    EC   |    3    |    4     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function cpx(...args) {
  const {cpu} = args[0];
  compare(...args, cpu.x);
}

/**
 * CPY                  CPY Compare memory and index Y                   CPY
 *                                                       N Z C I D V
 * Operation:  Y - M                                     / / / _ _ _
 *                                (Ref: 7.9)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   CPY *Oper           |    C0   |    2    |    2     |
 * |  Zero Page     |   CPY Oper            |    C4   |    2    |    3     |
 * |  Absolute      |   CPY Oper            |    CC   |    3    |    4     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function cpy(...args) {
  const {cpu} = args[0];
  compare(...args, cpu.y);
}

/**
 * DEC                   DEC Decrement memory by one                     DEC
 *
 * Operation:  M - 1 -> M                                N Z C I D V
 *                                                       / / _ _ _ _
 *                                (Ref: 10.7)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Zero Page     |   DEC Oper            |    C6   |    2    |    5     |
 * |  Zero Page,X   |   DEC Oper,X          |    D6   |    2    |    6     |
 * |  Absolute      |   DEC Oper            |    CE   |    3    |    6     |
 * |  Absolute,X    |   DEC Oper,X          |    DE   |    3    |    7     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function dec({cpu, mmu, addr}) {
  const src = (mmu.r8(addr) - 1) & 0xff;
  cpu.sign(src);
  cpu.zero(src);
  mmu.w8(src, addr);
}

/**
 * DEX                   DEX Decrement index X by one                    DEX
 *
 * Operation:  X - 1 -> X                                N Z C I D V
 *                                                       / / _ _ _ _
 *                                (Ref: 7.6)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   DEX                 |    CA   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function dex({cpu}) {
  const src = (cpu.x - 1) & 0xff;
  cpu.sign(src);
  cpu.zero(src);
  cpu.x = src;
}

/**
 * DEY                   DEY Decrement index Y by one                    DEY
 *
 * Operation:  X - 1 -> Y                                N Z C I D V
 *                                                       / / _ _ _ _
 *                                (Ref: 7.7)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   DEY                 |    88   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function dey({cpu}) {
  const src = (cpu.y - 1) & 0xff;
  cpu.sign(src);
  cpu.zero(src);
  cpu.y = src;
}

/**
 * EOR            EOR "Exclusive-Or" memory with accumulator             EOR
 *
 * Operation:  A EOR M -> A                              N Z C I D V
 *                                                       / / _ _ _ _
 *                              (Ref: 2.2.3.2)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   EOR #Oper           |    49   |    2    |    2     |
 * |  Zero Page     |   EOR Oper            |    45   |    2    |    3     |
 * |  Zero Page,X   |   EOR Oper,X          |    55   |    2    |    4     |
 * |  Absolute      |   EOR Oper            |    4D   |    3    |    4     |
 * |  Absolute,X    |   EOR Oper,X          |    5D   |    3    |    4*    |
 * |  Absolute,Y    |   EOR Oper,Y          |    59   |    3    |    4*    |
 * |  (Indirect,X)  |   EOR (Oper,X)        |    41   |    2    |    6     |
 * |  (Indirect),Y  |   EOR (Oper),Y        |    51   |    2    |    5*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if page boundary is crossed.
 */
export function eor({cpu, mmu, addr}) {
  const src = mmu.r8(addr) ^ cpu.a;
  cpu.sign(src);
  cpu.zero(src);
  cpu.a = src;
}

/**
 * INC                    INC Increment memory by one                    INC
 *                                                       N Z C I D V
 * Operation:  M + 1 -> M                                / / _ _ _ _
 *                                (Ref: 10.6)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Zero Page     |   INC Oper            |    E6   |    2    |    5     |
 * |  Zero Page,X   |   INC Oper,X          |    F6   |    2    |    6     |
 * |  Absolute      |   INC Oper            |    EE   |    3    |    6     |
 * |  Absolute,X    |   INC Oper,X          |    FE   |    3    |    7     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function inc({cpu, mmu, addr}) {
  const src = (mmu.r8(addr) + 1) & 0xff;
  cpu.sign(src);
  cpu.zero(src);
  mmu.w8(src, addr);
}

/**
 * INX                    INX Increment Index X by one                   INX
 *                                                       N Z C I D V
 * Operation:  X + 1 -> X                                / / _ _ _ _
 *                                (Ref: 7.4)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   INX                 |    E8   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function inx({cpu}) {
  const src = ++cpu.x & 0xff;
  cpu.sign(src);
  cpu.zero(src);
  cpu.x = src;
}


/**
 * INY                    INY Increment Index Y by one                   INY
 *
 * Operation:  X + 1 -> X                                N Z C I D V
 *                                                       / / _ _ _ _
 *                                (Ref: 7.5)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   INY                 |    C8   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function iny({cpu}) {
  const src = ++cpu.y & 0xff;
  cpu.sign(src);
  cpu.zero(src);
  cpu.y = src;
}

/**
 * JMP                     JMP Jump to new location                      JMP
 *
 * Operation:  (PC + 1) -> PCL                           N Z C I D V
 *             (PC + 2) -> PCH   (Ref: 4.0.2)            _ _ _ _ _ _
 *                               (Ref: 9.8.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Absolute      |   JMP Oper            |    4C   |    3    |    3     |
 * |  Indirect      |   JMP (Oper)          |    6C   |    3    |    5     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function jmp({cpu, addr}) {
  cpu.pc = addr;
}

/**
 * JSR          JSR Jump to new location saving return address           JSR
 *
 * Operation:  PC + 2 toS, (PC + 1) -> PCL               N Z C I D V
 *                         (PC + 2) -> PCH               _ _ _ _ _ _
 *                                (Ref: 8.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Absolute      |   JSR Oper            |    20   |    3    |    6     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function jsr({cpu, addr}) {
  cpu.push16(cpu.pc - 1);
  cpu.pc = addr;
}

/**
 * LDA                  LDA Load accumulator with memory                 LDA
 *
 * Operation:  M -> A                                    N Z C I D V
 *                                                       / / _ _ _ _
 *                               (Ref: 2.1.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   LDA #Oper           |    A9   |    2    |    2     |
 * |  Zero Page     |   LDA Oper            |    A5   |    2    |    3     |
 * |  Zero Page,X   |   LDA Oper,X          |    B5   |    2    |    4     |
 * |  Absolute      |   LDA Oper            |    AD   |    3    |    4     |
 * |  Absolute,X    |   LDA Oper,X          |    BD   |    3    |    4*    |
 * |  Absolute,Y    |   LDA Oper,Y          |    B9   |    3    |    4*    |
 * |  (Indirect,X)  |   LDA (Oper,X)        |    A1   |    2    |    6     |
 * |  (Indirect),Y  |   LDA (Oper),Y        |    B1   |    2    |    5*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 if page boundary is crossed.
 */
export function lda(...args) {
  const {cpu} = args[0];
  cpu.a = load(...args);
};

/**
 * LDX                   LDX Load index X with memory                    LDX
 *
 * Operation:  M -> X                                    N Z C I D V
 *                                                       / / _ _ _ _
 *                                (Ref: 7.0)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   LDX #Oper           |    A2   |    2    |    2     |
 * |  Zero Page     |   LDX Oper            |    A6   |    2    |    3     |
 * |  Zero Page,Y   |   LDX Oper,Y          |    B6   |    2    |    4     |
 * |  Absolute      |   LDX Oper            |    AE   |    3    |    4     |
 * |  Absolute,Y    |   LDX Oper,Y          |    BE   |    3    |    4*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 when page boundary is crossed.
 */
export function ldx(...args) {
  const {cpu} = args[0];
  cpu.x = load(...args);
}

/**
 * LDY                   LDY Load index Y with memory                    LDY
 *                                                       N Z C I D V
 * Operation:  M -> Y                                    / / _ _ _ _
 *                                (Ref: 7.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   LDY #Oper           |    A0   |    2    |    2     |
 * |  Zero Page     |   LDY Oper            |    A4   |    2    |    3     |
 * |  Zero Page,X   |   LDY Oper,X          |    B4   |    2    |    4     |
 * |  Absolute      |   LDY Oper            |    AC   |    3    |    4     |
 * |  Absolute,X    |   LDY Oper,X          |    BC   |    3    |    4*    |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 when page boundary is crossed.
 */
export function ldy(...args) {
  const {cpu} = args[0];
  cpu.y = load(...args);
}

/**
 * LSR          LSR Shift right one bit (memory or accumulator)          LSR
 *
 *                  +-+-+-+-+-+-+-+-+
 * Operation:  0 -> |7|6|5|4|3|2|1|0| -> C               N Z C I D V
 *                  +-+-+-+-+-+-+-+-+                    0 / / _ _ _
 *                                (Ref: 10.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Accumulator   |   LSR A               |    4A   |    1    |    2     |
 * |  Zero Page     |   LSR Oper            |    46   |    2    |    5     |
 * |  Zero Page,X   |   LSR Oper,X          |    56   |    2    |    6     |
 * |  Absolute      |   LSR Oper            |    4E   |    3    |    6     |
 * |  Absolute,X    |   LSR Oper,X          |    5E   |    3    |    7     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function lsr({opcode, cpu, mmu, addr}) {
  const execute = (src) => {
    cpu.carry(src & 1);
    src >>= 1;
    cpu.sign(src);
    cpu.zero(src);
    return src;
  };

  if (opcode === 0x4a) {
    cpu.a = execute(cpu.a);
  } else {
    const src = execute(mmu.r8(addr));
    mmu.w8(src, addr);
  }
}

/**
 * NOP                         NOP No operation                          NOP
 *                                                       N Z C I D V
 * Operation:  No Operation (2 cycles)                   _ _ _ _ _ _
 *
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   NOP                 |    EA   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function nop() {}

/**
 * ORA                 ORA "OR" memory with accumulator                  ORA
 *
 * Operation: A V M -> A                                 N Z C I D V
 *                                                       / / _ _ _ _
 *                              (Ref: 2.2.3.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   ORA #Oper           |    09   |    2    |    2     |
 * |  Zero Page     |   ORA Oper            |    05   |    2    |    3     |
 * |  Zero Page,X   |   ORA Oper,X          |    15   |    2    |    4     |
 * |  Absolute      |   ORA Oper            |    0D   |    3    |    4     |
 * |  Absolute,X    |   ORA Oper,X          |    10   |    3    |    4*    |
 * |  Absolute,Y    |   ORA Oper,Y          |    19   |    3    |    4*    |
 * |  (Indirect,X)  |   ORA (Oper,X)        |    01   |    2    |    6     |
 * |  (Indirect),Y  |   ORA (Oper),Y        |    11   |    2    |    5     |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 on page crossing
 */
export function ora({cpu, mmu, addr}) {
  const src = mmu.r8(addr) | cpu.a;
  cpu.sign(src);
  cpu.zero(src);
  cpu.a = src;
}

/**
 * PHA                   PHA Push accumulator on stack                   PHA
 *
 * Operation:  A toS                                     N Z C I D V
 *                                                       _ _ _ _ _ _
 *                                (Ref: 8.5)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   PHA                 |    48   |    1    |    3     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function pha({cpu}) {
  cpu.push8(cpu.a);
}

/**
 * PHP                 PHP Push processor status on stack                PHP
 *
 * Operation:  P toS                                     N Z C I D V
 *                                                       _ _ _ _ _ _
 *                                (Ref: 8.11)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   PHP                 |    08   |    1    |    3     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function php({cpu}) {
  cpu.push8(cpu.stat);
}

/**
 * PLA                 PLA Pull accumulator from stack                   PLA
 *
 * Operation:  A fromS                                   N Z C I D V
 *                                                       _ _ _ _ _ _
 *                                (Ref: 8.6)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   PLA                 |    68   |    1    |    4     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function pla({cpu}) {
  cpu.a = cpu.pull8();
  cpu.sign(cpu.a);
  cpu.zero(cpu.a);
}

/**
 * PLP               PLP Pull processor status from stack                PLA
 *
 * Operation:  P fromS                                   N Z C I D V
 *                                                        From Stack
 *                                (Ref: 8.12)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   PLP                 |    28   |    1    |    4     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function plp({cpu}) {
  cpu.stat = cpu.pull8();
}

/**
 * ROL          ROL Rotate one bit left (memory or accumulator)          ROL
 *
 *              +------------------------------+
 *              |         M or A               |
 *              |   +-+-+-+-+-+-+-+-+    +-+   |
 * Operation:   +-< |7|6|5|4|3|2|1|0| <- |C| <-+         N Z C I D V
 *                  +-+-+-+-+-+-+-+-+    +-+             / / / _ _ _
 *                                (Ref: 10.3)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Accumulator   |   ROL A               |    2A   |    1    |    2     |
 * |  Zero Page     |   ROL Oper            |    26   |    2    |    5     |
 * |  Zero Page,X   |   ROL Oper,X          |    36   |    2    |    6     |
 * |  Absolute      |   ROL Oper            |    2E   |    3    |    6     |
 * |  Absolute,X    |   ROL Oper,X          |    3E   |    3    |    7     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function rol({opcode, cpu, mmu, addr}) {
  const execute = (src) => {
    src <<= 1;
    if (cpu.carry()) src |= 1;
    cpu.carry(src > 0xff);
    src &= 0xff;
    cpu.sign(src);
    cpu.zero(src);
    return src;
  };

  if (opcode === 0x2a) {
    cpu.a = execute(cpu.a);
  } else {
    const src = execute(mmu.r8(addr));
    mmu.w8(src, addr);
  }
}

/**
 * ROR          ROR Rotate one bit right (memory or accumulator)         ROR
 *
 *              +------------------------------+
 *              |                              |
 *              |   +-+    +-+-+-+-+-+-+-+-+   |
 * Operation:   +-> |C| -> |7|6|5|4|3|2|1|0| >-+         N Z C I D V
 *                  +-+    +-+-+-+-+-+-+-+-+             / / / _ _ _
 *                                (Ref: 10.4)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Accumulator   |   ROR A               |    6A   |    1    |    2     |
 * |  Zero Page     |   ROR Oper            |    66   |    2    |    5     |
 * |  Zero Page,X   |   ROR Oper,X          |    76   |    2    |    6     |
 * |  Absolute      |   ROR Oper            |    6E   |    3    |    6     |
 * |  Absolute,X    |   ROR Oper,X          |    7E   |    3    |    7     |
 * +----------------+-----------------------+---------+---------+----------+
 *
 *   Note: ROR instruction is available on MCS650X microprocessors after
 *         June, 1976.
 */
export function ror({opcode, cpu, mmu, addr}) {
  const execute = (src) => {
    if (cpu.carry()) src |= 0x100;
    cpu.carry(src & 1);
    src >>= 1;
    cpu.sign(src);
    cpu.zero(src);
    return src;
  };

  if (opcode === 0x6a) {
    cpu.a = execute(cpu.a);
  } else {
    const src = update(mmu.r8(addr));
    mmu.w8(src, addr);
  }
}

/**
 * RTI                    RTI Return from interrupt                      RTI
 *                                                       N Z C I D V
 * Operation:  P fromS PC fromS                           From Stack
 *                                (Ref: 9.6)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   RTI                 |    40   |    1    |    6     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function rti({cpu}) {
  cpu.stat = cpu.pull8();
  cpu.pc = cpu.pull16();
}

/**
 * RTS                    RTS Return from subroutine                     RTS
 *                                                       N Z C I D V
 * Operation:  PC fromS, PC + 1 -> PC                    _ _ _ _ _ _
 *                                (Ref: 8.2)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   RTS                 |    60   |    1    |    6     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function rts({cpu}) {
  cpu.pc = (cpu.pull16() + 1) & 0xffff;
}

/**
 * SBC          SBC Subtract memory from accumulator with borrow         SBC
 *                     -
 * Operation:  A - M - C -> A                            N Z C I D V
 *        -                                              / / / _ _ /
 *   Note:C = Borrow             (Ref: 2.2.2)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Immediate     |   SBC #Oper           |    E9   |    2    |    2     |
 * |  Zero Page     |   SBC Oper            |    E5   |    2    |    3     |
 * |  Zero Page,X   |   SBC Oper,X          |    F5   |    2    |    4     |
 * |  Absolute      |   SBC Oper            |    ED   |    3    |    4     |
 * |  Absolute,X    |   SBC Oper,X          |    FD   |    3    |    4*    |
 * |  Absolute,Y    |   SBC Oper,Y          |    F9   |    3    |    4*    |
 * |  (Indirect,X)  |   SBC (Oper,X)        |    E1   |    2    |    6     |
 * |  (Indirect),Y  |   SBC (Oper),Y        |    F1   |    2    |    5     |
 * +----------------+-----------------------+---------+---------+----------+
 * * Add 1 when page boundary is crossed.
 */
export function sbc({cpu, addr}) {
  const carry = cpu.carry() ? 0 : 1;
  const src = mmu.r8(addr);

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

/**
 * SEC                        SEC Set carry flag                         SEC
 *
 * Operation:  1 -> C                                    N Z C I D V
 *                                                       _ _ 1 _ _ _
 *                               (Ref: 3.0.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   SEC                 |    38   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function sec({cpu}) {
  cpu.carry(true);
}

/**
 * SED                       SED Set decimal mode                        SED
 *                                                       N Z C I D V
 * Operation:  1 -> D                                    _ _ _ _ 1 _
 *                               (Ref: 3.3.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   SED                 |    F8   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function sed({cpu}) {
  cpu.decimal(true);
}

/**
 * SEI                 SEI Set interrupt disable status                  SED
 *                                                       N Z C I D V
 * Operation:  1 -> I                                    _ _ _ 1 _ _
 *                               (Ref: 3.2.1)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   SEI                 |    78   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function sei({cpu}) {
  cpu.interrupt(true);
}

/**
 * STA                  STA Store accumulator in memory                  STA
 *
 * Operation:  A -> M                                    N Z C I D V
 *                                                       _ _ _ _ _ _
 *                               (Ref: 2.1.2)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Zero Page     |   STA Oper            |    85   |    2    |    3     |
 * |  Zero Page,X   |   STA Oper,X          |    95   |    2    |    4     |
 * |  Absolute      |   STA Oper            |    8D   |    3    |    4     |
 * |  Absolute,X    |   STA Oper,X          |    9D   |    3    |    5     |
 * |  Absolute,Y    |   STA Oper, Y         |    99   |    3    |    5     |
 * |  (Indirect,X)  |   STA (Oper,X)        |    81   |    2    |    6     |
 * |  (Indirect),Y  |   STA (Oper),Y        |    91   |    2    |    6     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function sta({cpu, mmu, addr}) {
  mmu.w8(cpu.a, addr);
}

/**
 * STX                    STX Store index X in memory                    STX
 *
 * Operation: X -> M                                     N Z C I D V
 *                                                       _ _ _ _ _ _
 *                                (Ref: 7.2)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Zero Page     |   STX Oper            |    86   |    2    |    3     |
 * |  Zero Page,Y   |   STX Oper,Y          |    96   |    2    |    4     |
 * |  Absolute      |   STX Oper            |    8E   |    3    |    4     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function stx({cpu, mmu, addr}) {
  mmu.w8(cpu.x, addr);
}

/**
 * STY                    STY Store index Y in memory                    STY
 *
 * Operation: Y -> M                                     N Z C I D V
 *                                                       _ _ _ _ _ _
 *                                (Ref: 7.3)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Zero Page     |   STY Oper            |    84   |    2    |    3     |
 * |  Zero Page,X   |   STY Oper,X          |    94   |    2    |    4     |
 * |  Absolute      |   STY Oper            |    8C   |    3    |    4     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export function sty({cpu, mmu, addr}) {
  mmu.w8(cpu.y, addr);
}

/**
 * TAX                TAX Transfer accumulator to index X                TAX
 *
 * Operation:  A -> X                                    N Z C I D V
 *                                                       / / _ _ _ _
 *                                (Ref: 7.11)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   TAX                 |    AA   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export const tax = transfer({from: 'a', to: 'x'});

/**
 * TAY                TAY Transfer accumulator to index Y                TAY
 *
 * Operation:  A -> Y                                    N Z C I D V
 *                                                       / / _ _ _ _
 *                                (Ref: 7.13)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   TAY                 |    A8   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export const tay = transfer({from: 'a', to: 'y'});

/**
 * TSX              TSX Transfer stack pointer to index X                TSX
 *
 * Operation:  S -> X                                    N Z C I D V
 *                                                       / / _ _ _ _
 *                                (Ref: 8.9)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   TSX                 |    BA   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export const tsx = transfer({from: 'sp', to: 'x'});

/**
 * TXA                TXA Transfer index X to accumulator                TXA
 *                                                       N Z C I D V
 * Operation:  X -> A                                    / / _ _ _ _
 *                                (Ref: 7.12)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   TXA                 |    8A   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export const txa = transfer({from: 'x', to: 'a'});

/**
 * TXS              TXS Transfer index X to stack pointer                TXS
 *                                                       N Z C I D V
 * Operation:  X -> S                                    _ _ _ _ _ _
 *                                (Ref: 8.8)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   TXS                 |    9A   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export const txs = transfer({from: 'x', to: 'sp'});

/**
 * TYA                TYA Transfer index Y to accumulator                TYA
 *
 * Operation:  Y -> A                                    N Z C I D V
 *                                                       / / _ _ _ _
 *                                (Ref: 7.14)
 * +----------------+-----------------------+---------+---------+----------+
 * | Addressing Mode| Assembly Language Form| OP CODE |No. Bytes|No. Cycles|
 * +----------------+-----------------------+---------+---------+----------+
 * |  Implied       |   TYA                 |    98   |    1    |    2     |
 * +----------------+-----------------------+---------+---------+----------+
 */
export const tya = transfer({from: 'y', to: 'a'});

// Unofficial opcodes

/**
 * ALR #i ($4B ii; 2 cycles)
 *
 * Equivalent to AND #i then LSR A. Some sources call this "ASR"; we do not
 * follow this out of confusion with the mnemonic for a pseudoinstruction that
 * combines CMP #$80 (or ANC #$FF) then ROR. Note that ALR #$FE acts like
 * LSR followed by CLC.
 */
export function alr(...args) {
  and(...args);
  lsr({...args, opcode: 0x4a});
}

/**
 * ANC #i ($0B ii, $2B ii; 2 cycles)
 *
 * Does AND #i, setting N and Z flags based on the result. Then it
 * copies N (bit 7) to C. ANC #$FF could be useful for sign-extending, much
 * like CMP #$80. ANC #$00 acts like LDA #$00 followed by CLC.
 */
export function anc({cpu, src}) {
  and({cpu, src});
  cpu.carry(cpu.sign());
}

/**
 * ARR #i ($6B ii; 2 cycles)
 *
 * Similar to AND #i then ROR A, except sets the flags differently. N and Z
 * are normal, but C is bit 6 and V is bit 6 xor bit 5. A fast way to perform
 * signed division by 4 is: CMP #$80; ARR #$FF; ROR. This can be extended to
 * larger powers of two.
 */
export function arr(...args) {
  const {cpu} = args[0];
  and(...args);
  ror({...args, opcode: 0x6a});
  cpu.carry(cpu.a & 0x40 > 0);
  cpu.overflow(((cpu.a & 0x40) ^ (cpu.a & 0x20)) > 0);
}

/**
 * AXS #i ($CB ii, 2 cycles)
 *
 * Sets X to {(A AND X) - #value without borrow}, and updates NZC. One might
 * use TXA AXS #-element_size to iterate through an array of structures or
 * other elements larger than a byte, where the 6502 architecture usually
 * prefers a structure of arrays. For example, TXA AXS #$FC could step to the
 * next OAM entry or to the next APU channel, saving one byte and four cycles
 * over four INXs. Also called SBX.
 */
export function axs({cpu, mmu, addr}) {
  const src = (cpu.a & cpu.x) - mmu.r8(addr);
  cpu.sign(src);
  cpu.zero(src);
  cpu.carry(src < 0x100);
  cpu.x = src & 0xff;
}

/**
 * LAX (d,X) ($A3 dd; 6 cycles)
 * LAX d ($A7 dd; 3 cycles)
 * LAX a ($AF aa aa; 4 cycles)
 * LAX (d),Y ($B3 dd; 5 cycles)
 * LAX d,Y ($B7 dd; 4 cycles)
 * LAX a,Y ($BF aa aa; 4 cycles)
 *
 * Shortcut for LDA value then TAX. Saves a byte and two cycles and allows use
 * of the X register with the (d),Y addressing mode. Notice that the immediate
 * is missing; the opcode that would have been LAX is affected by line noise
 * on the data bus. MOS 6502: even the bugs have bugs.
 */
export const lax = combine(lda, tax);

/**
 * SAX (d,X) ($83 dd; 6 cycles)
 * SAX d ($87 dd; 3 cycles)
 * SAX a ($8F aa aa; 4 cycles)
 * SAX d,Y ($97 aa aa; 4 cycles)
 *
 * Stores the bitwise AND of A and X. As with STA and STX, no flags are
 * affected.
 */
export function sax({cpu, mmu, addr}) {
  mmu.w8(cpu.a & cpu.x);
}

/**
 * DCP (d,X) ($C3 dd; 8 cycles)
 * DCP d ($C7 dd; 5 cycles)
 * DCP a ($CF aa aa; 6 cycles)
 * DCP (d),Y ($D3 dd; 8 cycles)
 * DCP d,X ($D7 dd; 6 cycles)
 * DCP a,Y ($DB aa aa; 7 cycles)
 * DCP a,X ($DF aa aa; 7 cycles)
 *
 * Equivalent to DEC value then CMP value, except supporting more addressing
 * modes. LDA #$FF followed by DCP can be used to check if the decrement
 * underflows, which is useful for multi-byte decrements.
 */
export const dcp = combine(dec, cmp);

/**
 * ISC (d,X) ($E3 dd; 8 cycles)
 * ISC d ($E7 dd; 5 cycles)
 * ISC a ($EF aa aa; 6 cycles)
 * ISC (d),Y ($F3 dd; 8 cycles)
 * ISC d,X ($F7 dd; 6 cycles)
 * ISC a,Y ($FB aa aa; 7 cycles)
 * ISC a,X ($FF aa aa; 7 cycles)
 *
 * Equivalent to INC value then SBC value, except supporting more addressing
 * modes.
 */
export const isc = combine(inc, sbc);

/**
 * RLA (d,X) ($23 dd; 8 cycles)
 * RLA d ($27 dd; 5 cycles)
 * RLA a ($2F aa aa; 6 cycles)
 * RLA (d),Y ($33 dd; 8 cycles)
 * RLA d,X ($37 dd; 6 cycles)
 * RLA a,Y ($3B aa aa; 7 cycles)
 * RLA a,X ($3F aa aa; 7 cycles)
 *
 * Equivalent to ROL value then AND value, except supporting more addressing
 * modes. LDA #$FF followed by RLA is an efficient way to rotate a variable
 * while also loading it in A.
 */
export const rla = combine(rol, and);

/**
 * RRA (d,X) ($63 dd; 8 cycles)
 * RRA d ($67 dd; 5 cycles)
 * RRA a ($6F aa aa; 6 cycles)
 * RRA (d),Y ($73 dd; 8 cycles)
 * RRA d,X ($77 dd; 6 cycles)
 * RRA a,Y ($7B aa aa; 7 cycles)
 * RRA a,X ($7F aa aa; 7 cycles)
 *
 * Equivalent to ROR value then ADC value, except supporting more addressing
 * modes. Essentially this computes A + value / 2, where value is 9-bit and the
 * division is rounded up.
 */
export const rra = combine(ror, adc);

/**
 * SLO (d,X) ($03 dd; 8 cycles)
 * SLO d ($07 dd; 5 cycles)
 * SLO a ($0F aa aa; 6 cycles)
 * SLO (d),Y ($13 dd; 8 cycles)
 * SLO d,X ($17 dd; 6 cycles)
 * SLO a,Y ($1B aa aa; 7 cycles)
 * SLO a,X ($1F aa aa; 7 cycles)
 *
 * Equivalent to ASL value then ORA value, except supporting more addressing
 * modes. LDA #0 followed by SLO is an efficient way to shift a variable while
 * also loading it in A.
 */
export const slo = combine(asl, ora);

/**
 * SRE (d,X) ($43 dd; 8 cycles)
 * SRE d ($47 dd; 5 cycles)
 * SRE a ($4F aa aa; 6 cycles)
 * SRE (d),Y ($53 dd; 8 cycles)
 * SRE d,X ($57 dd; 6 cycles)
 * SRE a,Y ($5B aa aa; 7 cycles)
 * SRE a,X ($5F aa aa; 7 cycles)
 *
 * Equivalent to LSR value then EOR value, except supporting more addressing
 * modes. LDA #0 followed by SRE is an efficient way to shift a variable while
 * also loading it in A.
 */
export const sre = combine(lsr, eor);

/**
 * SKB #i ($80 ii, $82 ii, $89 ii, $C2 ii, $E2 ii; 2 cycles)
 *
 * These unofficial opcodes just read an immediate byte and skip it, like a
 * different address mode of NOP. One of these even works almost the same way
 * on 65C02, HuC6280, and 65C816: BIT #i ($89 ii), whose only difference from
 * the 6502 is that it affects the NVZ flags like the other BIT instructions.
 * Use this SKB if you want your code to be portable to Lynx, TG16, or Super
 * NES. Puzznic uses $89, and Beauty and the Beast uses $80. Also called DOP,
 * NOP (distinguished from the 1-byte encoding by the addressing mode).
 */
export function skb() {}

/**
 * IGN a ($0C aa aa; 4 cycles)
 * IGN a,X ($1C aa aa, $3C aa aa, $5C aa aa, $7C aa aa, $DC aa aa,
 * $FC aa aa; 4 or 5 cycles)
 * IGN d ($04 dd, $44 dd, $64 dd; 3 cycles)
 * IGN d,X ($14 dd, $34 dd, $54 dd, $74 dd, $D4 dd, $F4 dd; 4 cycles)
 *
 * Reads from memory at the specified address and ignores the value.
 * Affects no register nor flags. The absolute version can be used to increment
 * PPUADDR or reset the PPUSTATUS latch as an alternative to BIT. The zero page
 * version has no side effects.
 *
 * IGN d,X reads from both d and (d+X)&255. IGN a,X additionally reads from
 * a+X-256 it crosses a page boundary (i.e. if ((a & 255) + X) > 255)
 *
 * Sometimes called TOP (triple-byte no-op), SKW (skip word), DOP (double-byte
 * no-op), or SKB (skip byte).
 */
export function ign() {}
