import {IRQ_BRK_ADDR} from './interrupts';

function branch({branchCycles, cpu, mmu, addr}, cond) {
  if (cond) {
    const next = cpu.pc + mmu.r8(addr).signed();
    cpu.t += cpu.pageCrossedCycles({branchCycles, addr: next});
    cpu.pc = next & 0xffff;
  }
}

function compare({cpu, mmu, addr}, val) {
  val -= mmu.r8(addr);
  cpu.carry(val >= 0);
  cpu.sign(val);
  cpu.zero(val & 0xff);
}

function decrement({cpu}, val) {
  val -= 1;
  val &= 0xff;
  cpu.sign(val);
  cpu.zero(val);
  return val;
}

function increment({cpu}, val) {
  val += 1;
  val &= 0xff;
  cpu.sign(val);
  cpu.zero(val);
  return val;
}

function load({cpu, mmu, addr}) {
  const val = mmu.r8(addr);
  cpu.sign(val);
  cpu.zero(val);
  return val;
}

const transfer = ({from, to}) => function transfer({cpu}) {
  const val = cpu[from];
  cpu.sign(val);
  cpu.zero(val);
  cpu[to] = val;
};

const combine = (...fns) => function combine({...inst}) {
  fns.forEach(fn => fn(inst));
}

function unknown({opcode}) {
  throw new Error(`Unimplemented opcode: ${opcode.to(16)}`);
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
  const val = mmu.r8(addr);
  let temp = val + cpu.a + carry;
  cpu.zero(temp & 0xff);
  if (cpu.decimal()) {
    if (((cpu.a & 0xf) + (val & 0xf) + carry) > 9) {
      temp += 6;
    }
    cpu.sign(temp);
    cpu.overflow(!((cpu.a ^ val) & 0x80) && ((cpu.a ^ temp) & 0x80));
    if (temp > 0x99) {
      temp += 96;
    }
    cpu.carry(temp > 0x99);
  } else {
    cpu.sign(temp);
    cpu.overflow(!((cpu.a ^ val) & 0x80) && ((cpu.a ^ temp) & 0x80));
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
  const val = mmu.r8(addr) & cpu.a;
  cpu.sign(val);
  cpu.zero(val);
  cpu.a = val;
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
  const execute = val => {
    cpu.carry(val & 0x80);
    val = (val << 1) & 0xff;
    cpu.sign(val);
    cpu.zero(val);
    return val;
  };

  if (opcode === 0x0a) {
    cpu.a = execute(cpu.a);
  } else {
    const val = execute(mmu.r8(addr));
    mmu.w8({val, addr});
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
export const bcc = ({cpu, ...inst}) => branch({...inst, cpu}, !cpu.carry());

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
export const bcs = ({cpu, ...inst}) => branch({...inst, cpu}, cpu.carry());

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
export const beq = ({cpu, ...inst}) => branch({...inst, cpu}, cpu.zero());

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
  const val = mmu.r8(addr);
  cpu.sign(val);
  cpu.overflow(val & 0x40);
  cpu.zero(val & cpu.a);
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
export const bmi = ({cpu, ...inst}) => branch({...inst, cpu}, cpu.sign());

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
export const bne = ({cpu, ...inst}) => branch({...inst, cpu}, !cpu.zero());

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
export const bpl = ({cpu, ...inst}) => branch({...inst, cpu}, !cpu.sign());

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
export function brk({cpu, mmu}) {
  cpu.push16(cpu.pc + 1);
  cpu.push8(cpu.stat | 0b110000); // Set bits 5 and 4.
  cpu.interrupt(true);
  cpu.pc = mmu.r16(IRQ_BRK_ADDR);
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
export const bvc = ({cpu, ...inst}) => branch({...inst, cpu}, !cpu.overflow());

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
export const bvs = ({cpu, ...inst}) => branch({...inst, cpu}, cpu.overflow());

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
export const cmp = ({cpu, ...inst}) => compare({...inst, cpu}, cpu.a);

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
export const cpx = ({cpu, ...inst}) => compare({...inst, cpu}, cpu.x);

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
export const cpy = ({cpu, ...inst}) => compare({...inst, cpu}, cpu.y);

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
  const val = decrement({cpu}, mmu.r8(addr));
  mmu.w8({val, addr});
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
  cpu.x = decrement({cpu}, cpu.x);
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
  cpu.y = decrement({cpu}, cpu.y);
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
  const val = mmu.r8(addr) ^ cpu.a;
  cpu.sign(val);
  cpu.zero(val);
  cpu.a = val;
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
  const val = increment({cpu}, mmu.r8(addr));
  mmu.w8({val, addr});
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
  cpu.x = increment({cpu}, cpu.x);
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
  cpu.y = increment({cpu}, cpu.y);
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
export function lda({cpu, ...inst}) {
  cpu.a = load({...inst, cpu});
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
export function ldx({cpu, ...inst}) {
  cpu.x = load({...inst, cpu});
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
export function ldy({cpu, ...inst}) {
  cpu.y = load({...inst, cpu});
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
  const execute = val => {
    cpu.carry(val & 1);
    val >>= 1;
    cpu.sign(val);
    cpu.zero(val);
    return val;
  };

  if (opcode === 0x4a) {
    cpu.a = execute(cpu.a);
  } else {
    const val = execute(mmu.r8(addr));
    mmu.w8({val, addr});
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
  const val = mmu.r8(addr) | cpu.a;
  cpu.sign(val);
  cpu.zero(val);
  cpu.a = val;
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
  cpu.push8(cpu.stat | 0b110000); // Set bits 5 and 4.
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
  cpu.stat = cpu.pull8() & 0b11001111; // Ignore bits 5 and 4.
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
  const execute = val => {
    val <<= 1;
    if (cpu.carry()) val |= 1;
    cpu.carry(val > 0xff);
    val &= 0xff;
    cpu.sign(val);
    cpu.zero(val);
    return val;
  };

  if (opcode === 0x2a) {
    cpu.a = execute(cpu.a);
  } else {
    const val = execute(mmu.r8(addr));
    mmu.w8({val, addr});
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
  const execute = val => {
    if (cpu.carry()) val |= 0x100;
    cpu.carry(val & 1);
    val >>= 1;
    cpu.sign(val);
    cpu.zero(val);
    return val;
  };

  if (opcode === 0x6a) {
    cpu.a = execute(cpu.a);
  } else {
    const val = execute(mmu.r8(addr));
    mmu.w8({val, addr});
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
  cpu.stat = cpu.pull8() & 0b11001111; // Ignore bits 5 and 4.
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
export function sbc({cpu, mmu, addr}) {
  const carry = cpu.carry() ? 0 : 1;
  const val = mmu.r8(addr);
  let temp = cpu.a - val - carry;
  cpu.sign(temp);
  cpu.zero(temp & 0xff);
  cpu.overflow(((cpu.a ^ temp) & 0x80) && ((cpu.a ^ val) & 0x80));
  if (cpu.decimal()) {
    if (((cpu.a & 0xf) - carry) < (val & 0xf)) {
      temp -= 6;
    }
    if (temp > 0x99) {
      temp -= 0x60;
    }
  }
  cpu.carry(temp < 0);
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
  mmu.w8({val: cpu.a, addr});
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
  mmu.w8({val: cpu.x, addr});
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
  mmu.w8({val: cpu.y, addr});
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
export function txs({cpu}) {
  cpu.sp = cpu.x;
}

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
 * AAC (ANC) [ANC]
 *
 * AND byte with accumulator. If result is negative then carry is set. Status
 * flags: N,Z,C
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Immediate   |AAC #arg   |$0B| 2 | 2
 * Immediate   |AAC #arg   |$2B| 2 | 2
 */
export function anc({cpu, ...inst}) {
  and({...inst, cpu});
  cpu.carry(cpu.sign());
}

/**
 * AAX (SAX) [AXS]
 *
 * AND X register with accumulator and store result in memory. Status
 * flags: N,Z
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Zero Page   |AAX arg    |$87| 2 | 3
 * Zero Page,Y |AAX arg,Y  |$97| 2 | 4
 * (Indirect,X)|AAX (arg,X)|$83| 2 | 6
 * Absolute    |AAX arg    |$8F| 3 | 4.
 */
export function sax({cpu, mmu, addr}) {
  mmu.w8({val: cpu.a & cpu.x, addr});
}

/**
 *  ARR (ARR) [ARR]
 *
 *  AND byte with accumulator, then rotate one bit right in accumulator and
 *  check bit 5 and 6:
 *
 *  - If both bits are 1: set C, clear V.
 *  - If both bits are 0: clear C and V.
 *  - If only bit 5 is 1: set V, clear C.
 *  - If only bit 6 is 1: set C and V.
 *
 *  Status flags: N,V,Z,C
 *
 *  Addressing  |Mnemonics  |Opc|Sz | n
 *  ------------|-----------|---|---|---
 *  Immediate   |ARR #arg   |$6B| 2 | 2
 */
export function arr({cpu, mmu, addr}) {
  let val;
  const and = val = cpu.a & mmu.r8(addr);
  if (cpu.carry()) {
    val |= 0x100;
  }
  val >>= 1; // `val` is ROR result actually.
  cpu.zero(val);

  if (cpu.decimal()) {
    cpu.sign(cpu.carry() ? 0x80 : 0);
    cpu.overflow((and ^ val) & 0x40);

    let hnib = and >> 4;
    let lnib = and & 0xf;

    if ((lnib + 1) > 5) {
      val = (val & 0xf0) | ((val + 6) & 0xf);
    }
    if ((hnib + 1) > 5) {
      cpu.carry(true);
      val = (val + 0x60) & 0xff;
    } else {
      cpu.carry(false);
    }
  } else {
    cpu.sign(val);
    cpu.carry(val & 0x40);
    cpu.overflow((val & 0x40) ^ (val & 0x20));
  }
  cpu.a = val;
}

/**
 * ASR (ASR) [ALR]
 *
 * AND byte with accumulator, then shift right one bit in accumulator.
 * Status flags: N,Z,C
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Immediate   |ASR #arg   |$4B| 2 | 2
 */
export function alr({...inst}) {
  and(inst);
  lsr({...inst, opcode: 0x4a});
}

/**
 * AXA (SHA) [AXA]
 *
 * AND X register with accumulator then AND result with 7 and store in memory.
 * Status flags: -
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Absolute,Y  |AXA arg,Y  |$9F| 3 | 5
 * (Indirect),Y|AXA arg    |$93| 2 | 6
 */
export function ahx({cpu, mmu, addr}) {
  mmu.w8({val: cpu.x & cpu.a & 7, addr});
}

/**
 * AXS (SBX) [SAX]
 *
 * AND X register with accumulator and store result in X register, then
 * subtract byte from X register (without borrow).
 * Status flags: N,Z,C
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Immediate   |AXS #arg   |$CB| 2 | 2
 */
export function axs({cpu, mmu, addr}) {
  const val = (cpu.x & cpu.a) - mmu.r8(addr);
  cpu.sign(val);
  cpu.zero(val);
  cpu.carry(val >= 0);
  cpu.x = val & 0xff;
}

/**
 * DCP (DCP) [DCM]
 *
 * Subtract 1 from memory (without borrow).
 * Status flags: C
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Zero Page   |DCP arg    |$C7| 2 | 5
 * Zero Page,X |DCP arg,X  |$D7| 2 | 6
 * Absolute    |DCP arg    |$CF| 3 | 6
 * Absolute,X  |DCP arg,X  |$DF| 3 | 7
 * Absolute,Y  |DCP arg,Y  |$DB| 3 | 7
 * (Indirect,X)|DCP (arg,X)|$C3| 2 | 8
 * (Indirect),Y|DCP (arg),Y|$D3| 2 | 8
 */
export const dcp = combine(dec, cmp);

/**
 * ISC (ISB) [INS]
 *
 * Increase memory by one, then subtract memory from accumulator (with borrow).
 * Status flags: N,V,Z,C
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Zero Page   |ISC arg    |$E7| 2 | 5
 * Zero Page,X |ISC arg,X  |$F7| 2 | 6
 * Absolute    |ISC arg    |$EF| 3 | 6
 * Absolute,X  |ISC arg,X  |$FF| 3 | 7
 * Absolute,Y  |ISC arg,Y  |$FB| 3 | 7
 * (Indirect,X)|ISC (arg,X)|$E3| 2 | 8
 * (Indirect),Y|ISC (arg),Y|$F3| 2 | 8
 */
export const isc = combine(inc, sbc);

/**
 * KIL (JAM) [HLT]
 *
 * Stop program counter (processor lock up).
 * Status flags: -
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Implied     |KIL        |$02| 1 | -
 * Implied     |KIL        |$12| 1 | -
 * Implied     |KIL        |$22| 1 | -
 * Implied     |KIL        |$32| 1 | -
 * Implied     |KIL        |$42| 1 | -
 * Implied     |KIL        |$52| 1 | -
 * Implied     |KIL        |$62| 1 | -
 * Implied     |KIL        |$72| 1 | -
 * Implied     |KIL        |$92| 1 | -
 * Implied     |KIL        |$B2| 1 | -
 * Implied     |KIL        |$D2| 1 | -
 * Implied     |KIL        |$F2| 1 | -
 */
export const stp = unknown;

/**
 * LAR (LAE) [LAS]
 *
 * AND memory with stack pointer, transfer result to accumulator, X
 * register and stack pointer.
 * Status flags: N,Z
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Absolute,Y  |LAR arg,Y  |$BB| 3 | 4 *
 */
export function las({cpu, mmu, addr}) {
  const val = cpu.sp & mmu.r8(addr);
  cpu.sign(val);
  cpu.zero(val);
  cpu.a = cpu.x = cpu.sp = val;
}

/**
 * LAX (LAX) [LAX]
 *
 * Load accumulator and X register with memory.
 * Status flags: N,Z
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Zero Page   |LAX arg    |$A7| 2 | 3
 * Zero Page,Y |LAX arg,Y  |$B7| 2 | 4
 * Absolute    |LAX arg    |$AF| 3 | 4
 * Absolute,Y  |LAX arg,Y  |$BF| 3 | 4 *
 * (Indirect,X)|LAX (arg,X)|$A3| 2 | 6
 * (Indirect),Y|LAX (arg),Y|$B3| 2 | 5 *
 */
export const lax = combine(lda, tax);

/**
 * RLA (RLA) [RLA]
 *
 * Rotate one bit left in memory, then AND accumulator with memory. Status
 * flags: N,Z,C
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Zero Page   |RLA arg    |$27| 2 | 5
 * Zero Page,X |RLA arg,X  |$37| 2 | 6
 * Absolute    |RLA arg    |$2F| 3 | 6
 * Absolute,X  |RLA arg,X  |$3F| 3 | 7
 * Absolute,Y  |RLA arg,Y  |$3B| 3 | 7
 * (Indirect,X)|RLA (arg,X)|$23| 2 | 8
 * (Indirect),Y|RLA (arg),Y|$33| 2 | 8
 */
export const rla = combine(rol, and);

/**
 * RRA (RRA) [RRA]
 *
 * Rotate one bit right in memory, then add memory to accumulator (with carry).
 * Status flags: N,V,Z,C
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Zero Page   |RRA arg    |$67| 2 | 5
 * Zero Page,X |RRA arg,X  |$77| 2 | 6
 * Absolute    |RRA arg    |$6F| 3 | 6
 * Absolute,X  |RRA arg,X  |$7F| 3 | 7
 * Absolute,Y  |RRA arg,Y  |$7B| 3 | 7
 * (Indirect,X)|RRA (arg,X)|$63| 2 | 8
 * (Indirect),Y|RRA (arg),Y|$73| 2 | 8
 */
export const rra = combine(ror, adc);

/**
 * SLO (SLO) [ASO]
 *
 * Shift left one bit in memory, then OR accumulator with memory.
 * Status flags: N,Z,C
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Zero Page   |SLO arg    |$07| 2 | 5
 * Zero Page,X |SLO arg,X  |$17| 2 | 6
 * Absolute    |SLO arg    |$0F| 3 | 6
 * Absolute,X  |SLO arg,X  |$1F| 3 | 7
 * Absolute,Y  |SLO arg,Y  |$1B| 3 | 7
 * (Indirect,X)|SLO (arg,X)|$03| 2 | 8
 * (Indirect),Y|SLO (arg),Y|$13| 2 | 8
 */
export const slo = combine(asl, ora);

/**
 * SRE (SRE) [LSE]
 *
 * Shift right one bit in memory, then EOR accumulator with memory. Status
 * flags: N,Z,C
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Zero Page   |SRE arg    |$47| 2 | 5
 * Zero Page,X |SRE arg,X  |$57| 2 | 6
 * Absolute    |SRE arg    |$4F| 3 | 6
 * Absolute,X  |SRE arg,X  |$5F| 3 | 7
 * Absolute,Y  |SRE arg,Y  |$5B| 3 | 7
 * (Indirect,X)|SRE (arg,X)|$43| 2 | 8
 * (Indirect),Y|SRE (arg),Y|$53| 2 | 8
 */
export const sre = combine(lsr, eor);

/**
 * SXA (SHX) [XAS]
 *
 * AND X register with the high byte of the target address of the argument + 1.
 * Store the result in memory.
 *
 * M = X AND HIGH(arg) + 1
 *
 * Status flags: -
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Absolute,Y  |SXA arg,Y  |$9E| 3 | 5
 */
export function shx({cpu, mmu, addr}) {
  let val = (mmu.r8(addr) >> 4) + 1;
  val &= cpu.x;
  mmu.w8({val, addr});
}

/**
 * SYA (SHY) [SAY]
 *
 * AND Y register with the high byte of the target address of the argument
 * 1. Store the result in memory.
 *
 * M = Y AND HIGH(arg) + 1
 *
 * Status flags: -
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Absolute,X  |SYA arg,X  |$9C| 3 | 5
 */
export function shy({cpu, mmu, addr}) {
  let val = (mmu.r8(addr) >> 4) + 1;
  val &= cpu.y;
  mmu.w8({val, addr});
}

/**
 * XAA (ANE) [XAA]
 *
 * Exact operation unknown. Read the referenced documents for more information
 * and observations.
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Immediate   |XAA #arg   |$8B| 2 | 2
 */
export const xaa = unknown;

/**
 * XAS (SHS) [TAS]
 *
 * AND X register with accumulator and store result in stack pointer, then
 * AND stack pointer with the high byte of the target address of the
 * argument + 1. Store result in memory.
 *
 * S = X AND A, M = S AND HIGH(arg) + 1
 *
 * Status flags: -
 *
 * Addressing  |Mnemonics  |Opc|Sz | n
 * ------------|-----------|---|---|---
 * Absolute,Y  |XAS arg,Y  |$9B| 3 | 5
 */
export function tas({cpu, mmu, addr}) {
  cpu.sp = cpu.x & cpu.a;
  let val = (mmu.r8(addr) >> 4) + 1;
  val &= cpu.sp;
  mmu.w8({val, addr});
}
