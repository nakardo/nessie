window.Nes =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 679:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => /* binding */ Nes
});

// EXTERNAL MODULE: ./src/shims/number.js
var number = __webpack_require__(593);
;// CONCATENATED MODULE: ./src/shims/debug.js


const debug = () => () => {};
// EXTERNAL MODULE: ./node_modules/performance-now/lib/performance-now.js
var performance_now = __webpack_require__(75);
var performance_now_default = /*#__PURE__*/__webpack_require__.n(performance_now);
// EXTERNAL MODULE: ./node_modules/raf/index.js
var raf = __webpack_require__(87);
var raf_default = /*#__PURE__*/__webpack_require__.n(raf);
;// CONCATENATED MODULE: ./src/shims/assert.js


function assert() {}
;// CONCATENATED MODULE: ./src/errors.js


class UnmappedAddressError extends Error {
  constructor(addr) {
    super(`${addr.to(16, 2)} is an unknown address`);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

}
;// CONCATENATED MODULE: ./src/cart/mappers/nrom.js


function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }


class NROM {
  constructor({
    prgRom,
    prgRam,
    chrRxm
  }) {
    _defineProperty(this, "prgRom", null);

    _defineProperty(this, "prgRam", null);

    _defineProperty(this, "chrRxm", null);

    _defineProperty(this, "prgRomLastPage", 0);

    this.prgRom = prgRom;
    this.prgRam = prgRam;
    this.chrRxm = chrRxm;
    this.prgRomLastPage = prgRom.length - 1;
    Object.seal(this);
  }

  w8({
    val,
    addr
  }) {
    if (addr < 0x2000) {
      const bank = addr >> 12 & 1;
      this.chrRxm[bank][addr & 0xfff] = val;
    } else if (addr < 0x6000) {
      throw new UnmappedAddressError(addr);
    } else if (addr < 0x8000) {
      this.prgRam[addr & 0x1fff] = val;
    } else {
      throw new UnmappedAddressError(addr);
    }
  }

  r8(addr) {
    if (addr < 0x2000) {
      const bank = addr >> 12 & 1;
      return this.chrRxm[bank][addr & 0xfff];
    } else if (addr < 0x6000) {
      throw new UnmappedAddressError(addr);
    } else if (addr < 0x8000) {
      return this.prgRam[addr & 0x1fff];
    } else if (addr < 0xc000) {
      return this.prgRom[0][addr & 0x3fff];
    } else {
      return this.prgRom[this.prgRomLastPage][addr & 0x3fff];
    }
  }

}
;// CONCATENATED MODULE: ./src/cart/mappers/mmc1.js


function mmc1_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }


const mmc1_debug = debug('nes:cart:mapper:mmc1');
class MMC1 {
  constructor({
    prgRom,
    prgRam,
    chrRxm
  }) {
    mmc1_defineProperty(this, "prgRom", null);

    mmc1_defineProperty(this, "prgRam", null);

    mmc1_defineProperty(this, "chrRxm", null);

    mmc1_defineProperty(this, "prgRomLastPage", 0);

    mmc1_defineProperty(this, "prgRamEnable", false);

    mmc1_defineProperty(this, "shift", 0);

    mmc1_defineProperty(this, "shiftCount", 0);

    mmc1_defineProperty(this, "mirroring", 0);

    mmc1_defineProperty(this, "prgRomBankMode", 0);

    mmc1_defineProperty(this, "chrRxmBankMode", 0);

    mmc1_defineProperty(this, "chrRxmBank", [0, 0]);

    mmc1_defineProperty(this, "prgRomBank", 0);

    this.prgRom = prgRom;
    this.prgRam = prgRam;
    this.chrRxm = chrRxm;
    this.prgRomLastPage = prgRom.length - 1;
    Object.seal(this);
  }

  shiftReset() {
    this.shift = 0;
    this.shiftCount = 0;
  }

  shiftRight(val) {
    this.shift >>= 1;
    this.shift |= (val & 1) << 4;
    this.shiftCount++;
  }

  getChrRxmBank(index) {
    if (this.chrRxmBankMode == 0) {
      if (index == 0) return this.chrRxmBank[0] & 0xfe;else return this.chrRxmBank[1] | 1;
    } else {
      return this.chrRxmBank[index];
    }
  }

  getPrgRomBank(index) {
    const mode = this.prgRomBankMode;

    if (mode == 0 || mode == 1) {
      if (index == 0) return this.prgRomBank & 0xfe;else return this.prgRomBank | 1;
    } else if (mode == 2) {
      if (index == 0) return 0;else return this.prgRomBank;
    } else if (mode == 3) {
      if (index == 0) return this.prgRomBank;else return this.prgRomLastPage;
    }
  }

  writeRegister(addr) {
    const hnib = addr >> 12;
    mmc1_debug('write register: %s, val: %s', hnib.to(16), this.shift.to(2));

    if (addr < 0xa000) {
      mmc1_debug('set control: %s', this.shift.to(2));
      this.mirroring = this.shift & 3;
      this.prgRomBankMode = this.shift >> 2 & 3;
      this.chrRxmBankMode = this.shift >> 4 & 1;
    } else if (addr < 0xe000) {
      const index = addr >> 14 & 1;
      this.chrRxmBank[index] = this.shift & 0x1f;
      mmc1_debug('set bank chr-rxm[%d]: %d', index, this.shift);
    } else {
      this.prgRamEnable = (this.shift & 0x10) == 0;
      this.prgRomBank = this.shift & 0xf;
      mmc1_debug('set bank prg-rom: %d', this.prgRomBank);
      mmc1_debug('prg-ram enable', this.prgRamEnable);
    }
  }

  w8({
    val,
    addr
  }) {
    if (addr < 0x2000) {
      const bank = this.getChrRxmBank(addr >> 12 & 1);
      this.chrRxm[bank][addr & 0xfff] = val;
    } else if (addr < 0x6000) {
      return;
    } else if (addr < 0x8000) {
      if (this.prgRamEnable) {
        this.prgRam[addr & 0x1fff] = val;
      }
    } else {
      if (val & 0x80) {
        mmc1_debug('reset control');
        this.prgRomBankMode = 3;
        this.shiftReset();
      } else if (this.shiftCount < 4) {
        this.shiftRight(val);
      } else {
        this.shiftRight(val);
        this.writeRegister(addr);
        this.shiftReset();
      }
    }
  }

  r8(addr) {
    if (addr < 0x2000) {
      const bank = this.getChrRxmBank(addr >> 12 & 1);
      return this.chrRxm[bank][addr & 0xfff];
    } else if (addr < 0x6000) {
      return 0;
    } else if (addr < 0x8000) {
      return this.prgRam[addr & 0x1fff];
    } else {
      const bank = this.getPrgRomBank(addr >> 14 & 1);
      return this.prgRom[bank][addr & 0x3fff];
    }
  }

}
;// CONCATENATED MODULE: ./src/cart/mappers/index.js





function UnknownMapper() {
  throw new Error('Unknown mapper');
}

const MAPPERS = new Array(0xff).fill(null).map(() => UnknownMapper);
MAPPERS[0] = NROM;
MAPPERS[1] = MMC1;
/* harmony default export */ const mappers = (MAPPERS);
;// CONCATENATED MODULE: ./src/cart/index.js


function cart_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




const cart_debug = debug('nes:cart');
class Cart {
  constructor(nes) {
    cart_defineProperty(this, "nes", null);

    cart_defineProperty(this, "prgRam", new Uint8Array(0x2000));

    cart_defineProperty(this, "prgRom", null);

    cart_defineProperty(this, "chrRxm", null);

    cart_defineProperty(this, "mapper", null);

    cart_defineProperty(this, "mirroring", 0);

    cart_defineProperty(this, "loaded", false);

    Object.seal(this);
    this.nes = nes;
  }

  static createMemory({
    data,
    pages,
    size
  }) {
    return new Array(pages).fill(null).map((_, i) => {
      const offset = i * size;
      const pageData = new Uint8Array(size);
      pageData.set(data.slice(offset, offset + size));
      return pageData;
    });
  }

  static isInesFormat1(data) {
    const ines2 = (data[7] >> 2 & 3) === 2;
    return data[0] === 0x4e && data[1] === 0x45 && data[2] === 0x53 && data[3] === 0x1a && !ines2;
  }

  load(data) {
    assert(Cart.isInesFormat1(data), 'invalid or unsupported iNES format');
    assert((data[6] & 4) === 0, 'cart contains trainer data');
    const prgRomPagesCount = data[4];
    const chrRxmPagesCount = data[5];
    const mapper = data[6] >> 4 | data[7] & 0xf0;
    const Mapper = mappers[mapper]; // Header data (16 bytes)

    cart_debug('mapper index: %d, uses: %s', mapper, Mapper.name);
    cart_debug('prg-rom 16kb size units: %d', prgRomPagesCount);
    cart_debug('chr-rxm 8kb size units: %d', chrRxmPagesCount);
    cart_debug('mirroring: %d', data[6] & 1);
    cart_debug('rom control byte #1: %s', data[6].to(2));
    cart_debug('rom control byte #2: %s', data[7].to(2)); // Cart memory & mapper

    this.prgRom = Cart.createMemory({
      data: data.slice(0x10),
      pages: prgRomPagesCount,
      size: 0x4000
    });
    let chrRxmData = new Array(0x2000);

    if (chrRxmPagesCount > 0) {
      chrRxmData = data.slice(0x10 + 0x4000 * prgRomPagesCount);
    }

    this.chrRxm = Cart.createMemory({
      data: chrRxmData,
      // 0 means the board uses chr-ram.
      pages: (chrRxmPagesCount || 1) << 1,
      // shift count to have 4kb banks.
      size: 0x1000
    });
    this.chrRxm.forEach((chrRxm, table) => {
      chrRxm.forEach((val, addr) => this.nes.video.updatePattern({
        table,
        val,
        addr
      }));
    });
    this.mapper = new Mapper({
      prgRom: this.prgRom,
      prgRam: this.prgRam,
      chrRxm: this.chrRxm
    });
    this.mirroring = data[6] & 1;
    this.loaded = true;
  }

  r8(addr) {
    assert(this.loaded, 'cart not loaded');
    return this.mapper.r8(addr);
  }

  w8({
    val,
    addr
  }) {
    assert(this.loaded, 'cart not loaded');
    return this.mapper.w8({
      val,
      addr
    });
  }

}
;// CONCATENATED MODULE: ./src/cpu/instructions.js


const branch = (reg, cond) => {
  return function branch({
    branchCycles,
    cpu,
    mem,
    addr
  }) {
    if (cpu[reg]() == cond) {
      const offset = mem.r8(addr);
      addr = cpu.pc + ((offset & 0x80) > 0 ? -((0xff & ~offset) + 1) : offset);
      cpu.cycles += cpu.pageCrossedCycles({
        branchCycles,
        addr
      });
      cpu.pc = addr & 0xffff;
    }
  };
};

const compare = reg => {
  return function compare({
    cpu,
    mem,
    addr
  }) {
    const val = cpu[reg];
    let res = mem.r8(addr);
    cpu.carry(val >= res);
    res = val - res;
    cpu.sign(res);
    cpu.zero(res);
  };
};

const decrement = reg => {
  return function decrement({
    cpu
  }) {
    const val = cpu[reg] - 1;
    cpu.sign(val);
    cpu.zero(val);
    cpu[reg] = val & 0xff;
  };
};

const increment = reg => {
  return function increment({
    cpu
  }) {
    const val = cpu[reg] + 1;
    cpu.sign(val);
    cpu.zero(val);
    cpu[reg] = val & 0xff;
  };
};

const load = reg => {
  return function load({
    cpu,
    mem,
    addr
  }) {
    const val = mem.r8(addr);
    cpu.sign(val);
    cpu.zero(val);
    cpu[reg] = val;
  };
};

function addWithCarry({
  cpu
}, val) {
  const res = cpu.a + val + (cpu.carry() ? 1 : 0);
  cpu.zero(res);
  cpu.sign(res);
  cpu.overflow(~(cpu.a ^ val) & (cpu.a ^ res) & 0x80);
  cpu.carry(res > 0xff);
  cpu.a = res & 0xff;
}

const andWithHighByte = ({
  reg,
  idx
}) => {
  return function andhb({
    cpu,
    mem,
    operand
  }) {
    let addr = mem.r16(operand);
    const haddr = addr >> 8;
    const laddr = addr & 0xff;

    if (laddr + cpu[idx] > 0xff) {
      addr = ((haddr & cpu[reg]) << 8) + laddr + cpu[idx];
    } else {
      addr = (haddr << 8) + laddr + cpu[idx];
    }

    const val = cpu[reg] & haddr + 1;
    mem.w8({
      val,
      addr
    });
  };
};

const transfer = ({
  from,
  to
}) => {
  return function transfer({
    cpu
  }) {
    const val = cpu[from];
    cpu.sign(val);
    cpu.zero(val);
    cpu[to] = val;
  };
};

const combine = (...fns) => {
  return function combine({ ...inst
  }) {
    fns.forEach(fn => fn(inst));
  };
};

function unknown({
  opcode,
  cpu
}) {
  throw new Error(`Invalid opcode: ${opcode.to(16)} at ${cpu.pc.to(16, 2)}`);
} // Official opcodes

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


const adc = ({
  cpu,
  mem,
  addr
}) => addWithCarry({
  cpu
}, mem.r8(addr));
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

function and({
  cpu,
  mem,
  addr
}) {
  const val = mem.r8(addr) & cpu.a;
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

function asl({
  opcode,
  cpu,
  mem,
  addr
}) {
  const execute = val => {
    cpu.carry(val & 0x80);
    val = val << 1 & 0xff;
    cpu.sign(val);
    cpu.zero(val);
    return val;
  };

  if (opcode === 0x0a) {
    cpu.a = execute(cpu.a);
  } else {
    const val = execute(mem.r8(addr));
    mem.w8({
      val,
      addr
    });
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

const bcc = branch('carry', false);
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

const bcs = branch('carry', true);
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

const beq = branch('zero', true);
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

function bit({
  cpu,
  mem,
  addr
}) {
  const val = mem.r8(addr);
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

const bmi = branch('sign', true);
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

const bne = branch('zero', false);
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

const bpl = branch('sign', false);
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

function brk({
  cpu
}) {
  cpu.brk = true;
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

const bvc = branch('overflow', false);
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

const bvs = branch('overflow', true);
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

function clc({
  cpu
}) {
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

function cld({
  cpu
}) {
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

function cli({
  cpu
}) {
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

function clv({
  cpu
}) {
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

const cmp = compare('a');
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

const cpx = compare('x');
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

const cpy = compare('y');
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

function dec({
  cpu,
  mem,
  addr
}) {
  const val = mem.r8(addr) - 1;
  cpu.sign(val);
  cpu.zero(val);
  mem.w8({
    val,
    addr
  });
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

const dex = decrement('x');
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

const dey = decrement('y');
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

function eor({
  cpu,
  mem,
  addr
}) {
  const val = mem.r8(addr) ^ cpu.a;
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

function inc({
  cpu,
  mem,
  addr
}) {
  const val = mem.r8(addr) + 1;
  cpu.sign(val);
  cpu.zero(val);
  mem.w8({
    val,
    addr
  });
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

const inx = increment('x');
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

const iny = increment('y');
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

function jmp({
  cpu,
  addr
}) {
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

function jsr({
  cpu,
  addr
}) {
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

const lda = load('a');
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

const ldx = load('x');
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

const ldy = load('y');
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

function lsr({
  opcode,
  cpu,
  mem,
  addr
}) {
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
    const val = execute(mem.r8(addr));
    mem.w8({
      val,
      addr
    });
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

function nop() {}
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

function ora({
  cpu,
  mem,
  addr
}) {
  const val = mem.r8(addr) | cpu.a;
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

function pha({
  cpu
}) {
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

function php({
  cpu
}) {
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

function pla({
  cpu
}) {
  const val = cpu.pull8();
  cpu.sign(val);
  cpu.zero(val);
  cpu.a = val;
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

function plp({
  cpu
}) {
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

function rol({
  opcode,
  cpu,
  mem,
  addr
}) {
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
    const val = execute(mem.r8(addr));
    mem.w8({
      val,
      addr
    });
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

function ror({
  opcode,
  cpu,
  mem,
  addr
}) {
  const execute = val => {
    if (cpu.carry()) {
      val |= 0x100;
    }

    cpu.carry(val & 1);
    val >>= 1;
    cpu.sign(val);
    cpu.zero(val);
    return val;
  };

  if (opcode === 0x6a) {
    cpu.a = execute(cpu.a);
  } else {
    const val = execute(mem.r8(addr));
    mem.w8({
      val,
      addr
    });
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

function rti({
  cpu
}) {
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

function rts({
  cpu
}) {
  cpu.pc = cpu.pull16() + 1 & 0xffff;
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

function sbc({
  cpu,
  mem,
  addr
}) {
  const val = mem.r8(addr) ^ 0xff;
  addWithCarry({
    cpu
  }, val);
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

function sec({
  cpu
}) {
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

function sed({
  cpu
}) {
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

function sei({
  cpu
}) {
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

function sta({
  cpu,
  mem,
  addr
}) {
  mem.w8({
    val: cpu.a,
    addr
  });
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

function stx({
  cpu,
  mem,
  addr
}) {
  mem.w8({
    val: cpu.x,
    addr
  });
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

function sty({
  cpu,
  mem,
  addr
}) {
  mem.w8({
    val: cpu.y,
    addr
  });
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

const tax = transfer({
  from: 'a',
  to: 'x'
});
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

const tay = transfer({
  from: 'a',
  to: 'y'
});
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

const tsx = transfer({
  from: 'sp',
  to: 'x'
});
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

const txa = transfer({
  from: 'x',
  to: 'a'
});
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

function txs({
  cpu
}) {
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

const tya = transfer({
  from: 'y',
  to: 'a'
}); // Unofficial opcodes

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

function anc({
  cpu,
  ...inst
}) {
  and({ ...inst,
    cpu
  });
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

function sax({
  cpu,
  mem,
  addr
}) {
  mem.w8({
    val: cpu.a & cpu.x,
    addr
  });
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

function arr({
  cpu,
  mem,
  addr
}) {
  let val = cpu.a & mem.r8(addr);

  if (cpu.carry()) {
    val |= 0x100;
  }

  cpu.overflow(val >> 7 & 1 ^ val >> 6 & 1);
  cpu.carry(val & 0x80);
  val >>= 1;
  cpu.zero(val);
  cpu.sign(val);
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

function alr({ ...inst
}) {
  and(inst);
  lsr({ ...inst,
    opcode: 0x4a
  });
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

function ahx({
  cpu,
  mem,
  addr
}) {
  mem.w8({
    val: cpu.x & cpu.a & 7,
    addr
  });
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

function axs({
  cpu,
  mem,
  addr
}) {
  const val = cpu.x & cpu.a;
  let res = mem.r8(addr);
  cpu.carry(val >= res);
  res = val - res;
  cpu.sign(res);
  cpu.zero(res);
  cpu.x = res & 0xff;
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

const dcp = combine(dec, cmp);
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

const isc = combine(inc, sbc);
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

const stp = unknown;
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

function las({
  cpu,
  mem,
  addr
}) {
  const val = cpu.sp & mem.r8(addr);
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

const lax = combine(lda, tax);
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

const rla = combine(rol, and);
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

const rra = combine(ror, adc);
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

const slo = combine(asl, ora);
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

const sre = combine(lsr, eor);
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

const shx = andWithHighByte({
  reg: 'x',
  idx: 'y'
});
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

const shy = andWithHighByte({
  reg: 'y',
  idx: 'x'
});
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

const xaa = unknown;
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

function tas({
  cpu,
  mem,
  addr
}) {
  cpu.sp = cpu.x & cpu.a;
  let val = (mem.r8(addr) >> 4) + 1;
  val &= cpu.sp;
  mem.w8({
    val,
    addr
  });
}
;// CONCATENATED MODULE: ./src/cpu/instruction-set.js


// prettier-ignore
 // prettier-ignore

const execute = [brk, ora, stp, slo, nop, ora, asl, slo, php, ora, asl, anc, nop, ora, asl, slo, bpl, ora, stp, slo, nop, ora, asl, slo, clc, ora, nop, slo, nop, ora, asl, slo, jsr, and, stp, rla, bit, and, rol, rla, plp, and, rol, anc, bit, and, rol, rla, bmi, and, stp, rla, nop, and, rol, rla, sec, and, nop, rla, nop, and, rol, rla, rti, eor, stp, sre, nop, eor, lsr, sre, pha, eor, lsr, alr, jmp, eor, lsr, sre, bvc, eor, stp, sre, nop, eor, lsr, sre, cli, eor, nop, sre, nop, eor, lsr, sre, rts, adc, stp, rra, nop, adc, ror, rra, pla, adc, ror, arr, jmp, adc, ror, rra, bvs, adc, stp, rra, nop, adc, ror, rra, sei, adc, nop, rra, nop, adc, ror, rra, nop, sta, nop, sax, sty, sta, stx, sax, dey, nop, txa, xaa, sty, sta, stx, sax, bcc, sta, stp, ahx, sty, sta, stx, sax, tya, sta, txs, tas, shy, sta, shx, ahx, ldy, lda, ldx, lax, ldy, lda, ldx, lax, tay, lda, tax, lax, ldy, lda, ldx, lax, bcs, lda, stp, lax, ldy, lda, ldx, lax, clv, lda, tsx, las, ldy, lda, ldx, lax, cpy, cmp, nop, dcp, cpy, cmp, dec, dcp, iny, cmp, dex, axs, cpy, cmp, dec, dcp, bne, cmp, stp, dcp, nop, cmp, dec, dcp, cld, cmp, nop, dcp, nop, cmp, dec, dcp, cpx, sbc, nop, isc, cpx, sbc, inc, isc, inx, sbc, nop, sbc, cpx, sbc, inc, isc, beq, sbc, stp, isc, nop, sbc, inc, isc, sed, sbc, nop, isc, nop, sbc, inc, isc]; // prettier-ignore

const mode = [6, 7, 6, 7, 11, 11, 11, 11, 6, 5, 4, 5, 1, 1, 1, 1, 10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2, 1, 7, 6, 7, 11, 11, 11, 11, 6, 5, 4, 5, 1, 1, 1, 1, 10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2, 6, 7, 6, 7, 11, 11, 11, 11, 6, 5, 4, 5, 1, 1, 1, 1, 10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2, 6, 7, 6, 7, 11, 11, 11, 11, 6, 5, 4, 5, 8, 1, 1, 1, 10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2, 5, 7, 5, 7, 11, 11, 11, 11, 6, 5, 6, 5, 1, 1, 1, 1, 10, 9, 6, 9, 12, 12, 13, 13, 6, 3, 6, 3, 2, 2, 3, 3, 5, 7, 5, 7, 11, 11, 11, 11, 6, 5, 6, 5, 1, 1, 1, 1, 10, 9, 6, 9, 12, 12, 13, 13, 6, 3, 6, 3, 2, 2, 3, 3, 5, 7, 5, 7, 11, 11, 11, 11, 6, 5, 6, 5, 1, 1, 1, 1, 10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2, 5, 7, 5, 7, 11, 11, 11, 11, 6, 5, 6, 5, 1, 1, 1, 1, 10, 9, 6, 9, 12, 12, 12, 12, 6, 3, 6, 3, 2, 2, 2, 2]; // prettier-ignore

const bytes = [2, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3, 2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3, 3, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3, 2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3, 1, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3, 2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3, 1, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3, 2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3, 2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3, 2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3, 2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 3, 3, 3, 3, 2, 2, 1, 2, 2, 2, 2, 2, 1, 3, 1, 3, 3, 3, 3, 3]; // prettier-ignore

const cycles = [7, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 4, 4, 6, 6, 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 4, 4, 6, 6, 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 6, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 3, 4, 6, 6, 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 5, 4, 6, 6, 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4, 2, 6, 2, 6, 4, 4, 4, 4, 2, 5, 2, 5, 5, 5, 5, 5, 2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4, 2, 5, 2, 5, 4, 4, 4, 4, 2, 4, 2, 4, 4, 4, 4, 4, 2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6, 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6, 2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7]; // prettier-ignore

const branchCycles = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0]; // prettier-ignore

const mnemonic = ['BRK', 'ORA', 'KIL', 'SLO', 'NOP', 'ORA', 'ASL', 'SLO', 'PHP', 'ORA', 'ASL', 'ANC', 'NOP', 'ORA', 'ASL', 'SLO', 'BPL', 'ORA', 'KIL', 'SLO', 'NOP', 'ORA', 'ASL', 'SLO', 'CLC', 'ORA', 'NOP', 'SLO', 'NOP', 'ORA', 'ASL', 'SLO', 'JSR', 'AND', 'KIL', 'RLA', 'BIT', 'AND', 'ROL', 'RLA', 'PLP', 'AND', 'ROL', 'ANC', 'BIT', 'AND', 'ROL', 'RLA', 'BMI', 'AND', 'KIL', 'RLA', 'NOP', 'AND', 'ROL', 'RLA', 'SEC', 'AND', 'NOP', 'RLA', 'NOP', 'AND', 'ROL', 'RLA', 'RTI', 'EOR', 'KIL', 'SRE', 'NOP', 'EOR', 'LSR', 'SRE', 'PHA', 'EOR', 'LSR', 'ALR', 'JMP', 'EOR', 'LSR', 'SRE', 'BVC', 'EOR', 'KIL', 'SRE', 'NOP', 'EOR', 'LSR', 'SRE', 'CLI', 'EOR', 'NOP', 'SRE', 'NOP', 'EOR', 'LSR', 'SRE', 'RTS', 'ADC', 'KIL', 'RRA', 'NOP', 'ADC', 'ROR', 'RRA', 'PLA', 'ADC', 'ROR', 'ARR', 'JMP', 'ADC', 'ROR', 'RRA', 'BVS', 'ADC', 'KIL', 'RRA', 'NOP', 'ADC', 'ROR', 'RRA', 'SEI', 'ADC', 'NOP', 'RRA', 'NOP', 'ADC', 'ROR', 'RRA', 'NOP', 'STA', 'NOP', 'SAX', 'STY', 'STA', 'STX', 'SAX', 'DEY', 'NOP', 'TXA', 'XAA', 'STY', 'STA', 'STX', 'SAX', 'BCC', 'STA', 'KIL', 'AHX', 'STY', 'STA', 'STX', 'SAX', 'TYA', 'STA', 'TXS', 'TAS', 'SHY', 'STA', 'SHX', 'AHX', 'LDY', 'LDA', 'LDX', 'LAX', 'LDY', 'LDA', 'LDX', 'LAX', 'TAY', 'LDA', 'TAX', 'LAX', 'LDY', 'LDA', 'LDX', 'LAX', 'BCS', 'LDA', 'KIL', 'LAX', 'LDY', 'LDA', 'LDX', 'LAX', 'CLV', 'LDA', 'TSX', 'LAS', 'LDY', 'LDA', 'LDX', 'LAX', 'CPY', 'CMP', 'NOP', 'DCP', 'CPY', 'CMP', 'DEC', 'DCP', 'INY', 'CMP', 'DEX', 'AXS', 'CPY', 'CMP', 'DEC', 'DCP', 'BNE', 'CMP', 'KIL', 'DCP', 'NOP', 'CMP', 'DEC', 'DCP', 'CLD', 'CMP', 'NOP', 'DCP', 'NOP', 'CMP', 'DEC', 'DCP', 'CPX', 'SBC', 'NOP', 'ISC', 'CPX', 'SBC', 'INC', 'ISC', 'INX', 'SBC', 'NOP', 'SBC', 'CPX', 'SBC', 'INC', 'ISC', 'BEQ', 'SBC', 'KIL', 'ISC', 'NOP', 'SBC', 'INC', 'ISC', 'SED', 'SBC', 'NOP', 'ISC', 'NOP', 'SBC', 'INC', 'ISC'];
/* harmony default export */ const instruction_set = (new Array(0x100).fill(null).map((_, i) => ({
  opcode: i,
  execute: execute[i],
  mode: mode[i],
  bytes: bytes[i],
  cycles: cycles[i],
  branchCycles: branchCycles[i],
  mnemonic: mnemonic[i]
})));
;// CONCATENATED MODULE: ./src/cpu/status-flags.js


/**
 * Status flags
 * See: https://wiki.nesdev.com/w/index.php/Status_flags
 *
 * 7  bit  0
 * ---- ----
 * NVss DIZC
 * |||| ||||
 * |||| |||+- Carry
 * |||| ||+-- Zero
 * |||| |+--- Interrupt Disable
 * |||| +---- Decimal
 * ||++------ No CPU effect, see: the B flag
 * |+-------- Overflow
 * +--------- Negative
 */
const SIGN = 1 << 7;
const OVERFLOW = 1 << 6;
const DECIMAL = 1 << 3;
const INTERRUPT = 1 << 2;
const ZERO = 1 << 1;
const CARRY = 1;
;// CONCATENATED MODULE: ./src/cpu/address-mode.js


const ABS = 1;
const ABS_X = 2;
const ABS_Y = 3;
const ACC = 4;
const IMM = 5;
const IMP = 6;
const IDX_IND = 7;
const IND = 8;
const IND_IDX = 9;
const REL = 10;
const ZERO_PAGE = 11;
const ZERO_PAGE_X = 12;
const ZERO_PAGE_Y = 13;
;// CONCATENATED MODULE: ./src/cpu/interrupts.js


const NMI_ADDR = 0xfffa;
const RESET_ADDR = 0xfffc;
const IRQ_BRK_ADDR = 0xfffe;
;// CONCATENATED MODULE: ./src/ppu/registers.js


/**
 * Controller ($2000) > write
 * Common name: PPUCTRL
 * Description: PPU control register
 * Access: write
 *
 * Various flags controlling PPU operation
 *
 * 7  bit  0
 * ---- ----
 * VPHB SINN
 * |||| ||||
 * |||| ||++- Base nametable address
 * |||| ||    (0 = $2000; 1 = $2400; 2 = $2800; 3 = $2C00)
 * |||| |+--- VRAM address increment per CPU read/write of PPUDATA
 * |||| |     (0: add 1, going across; 1: add 32, going down)
 * |||| +---- Sprite pattern table address for 8x8 sprites
 * ||||       (0: $0000; 1: $1000; ignored in 8x16 mode)
 * |||+------ Background pattern table address (0: $0000; 1: $1000)
 * ||+------- Sprite size (0: 8x8 pixels; 1: 8x16 pixels)
 * |+-------- PPU master/slave select
 * |          (0: read backdrop from EXT pins; 1: output color on EXT pins)
 * +--------- Generate an NMI at the start of the
 *            vertical blanking interval (0: off; 1: on)
 */
const PPUCTRL = 0x2000;
const PPUMASK = 0x2001;
const PPUSTATUS = 0x2002;
const OAMADDR = 0x2003;
const OAMDATA = 0x2004;
const PPUSCROLL = 0x2005;
const PPUADDR = 0x2006;
const PPUDATA = 0x2007;
const OAMDMA = 0x4014;
;// CONCATENATED MODULE: ./src/cpu/memory.js


function memory_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }





const memory_debug = debug('nes:cpu:memory');
const test = debug('nes:test');
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
 * | $4020   | $1FE0 |       | Expansion ROM         |
 * | $6000   | $2000 |       | SRAM                  |
 * | $8000   | $4000 |       | PRG-ROM               |
 * | $C000   | $4000 |       | PRG-ROM               |
 * +---------+-------+-------+-----------------------+
 *        Flag Legend: M = Mirror of $0000
 *                     R = Mirror of $2000-2008 every 8 bytes
 *                         (e.g. $2008=$2000, $2018=$2000, etc.)
 */

class Memory {
  constructor(nes) {
    memory_defineProperty(this, "nes", null);

    memory_defineProperty(this, "ram", new Uint8Array(0x800));

    memory_defineProperty(this, "apu", new Uint8Array(0x18));

    this.nes = nes;
    Object.seal(this);
  }

  r8(addr) {
    assert(typeof addr === 'number', 'invalid address');
    addr &= 0xffff;
    memory_debug('read at: %s', addr.to(16, 2));

    switch (addr >> 12) {
      case 0x0:
      case 0x1:
        return this.ram[addr & 0x7ff];

      case 0x2:
      case 0x3:
        return this.nes.ppu.r8(addr);

      default:
        if (addr == OAMDMA) this.nes.ppu.r8(addr);else if (addr == 0x4016) return this.nes.controller.read();else if (addr < 0x4018) return this.apu[addr & 0x1f];else if (addr < 0x4020) return 0;
        return this.nes.cart.r8(addr);
    } // eslint-disable-next-line no-unreachable


    throw new UnmappedAddressError(addr);
  }

  w8({
    val,
    addr
  }) {
    assert(typeof val === 'number', 'invalid value');
    assert(typeof addr === 'number', 'invalid address');
    addr &= 0xffff;
    memory_debug('write at: %s, val: %s', addr.to(16, 2), val.to(16));

    switch (addr >> 12) {
      case 0x0:
      case 0x1:
        this.ram[addr & 0x7ff] = val;
        return;

      case 0x2:
      case 0x3:
        this.nes.ppu.w8({
          val,
          addr
        });
        return;

      default:
        if (addr == OAMDMA) {
          this.nes.ppu.w8({
            val,
            addr
          });
          return;
        } else if (addr == 0x4016) {
          this.nes.controller.write(val);
          return;
        } else if (addr < 0x4018) {
          this.apu[addr & 0x1f] = val;
          return;
        } else if (addr < 0x4020) {
          return;
        } else if (addr < 0x6004) {
          test('%s: %s', addr.to(16), val.to(16));

          if (addr == 0x6000 && val != 0x80) {// if (val === 0) process.exit(0);
            // test('invalid result code: %s', val.to(16));
            // process.exit(1);
          }
        } else if (addr < 0x8000) {// process.stdout.write(String.fromCharCode(val));
        }

        this.nes.cart.w8({
          val,
          addr
        });
        return;
    } // eslint-disable-next-line no-unreachable


    throw new UnmappedAddressError(addr);
  }

  r16(addr) {
    return this.r8(addr) | this.r8(++addr) << 8;
  }

}
;// CONCATENATED MODULE: ./src/cpu/6502.js


function _6502_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }






const _6502_debug = debug('nes:cpu');
const interrupt = debug('nes:cpu:int');
const stack = debug('nes:cpu:stack');
class MOS6502 {
  constructor(mem) {
    _6502_defineProperty(this, "mem", null);

    _6502_defineProperty(this, "a", 0);

    _6502_defineProperty(this, "x", 0);

    _6502_defineProperty(this, "y", 0);

    _6502_defineProperty(this, "stat", 0);

    _6502_defineProperty(this, "pc", 0);

    _6502_defineProperty(this, "sp", 0);

    _6502_defineProperty(this, "cycles", 0);

    _6502_defineProperty(this, "haltCycles", 0);

    _6502_defineProperty(this, "irq", false);

    _6502_defineProperty(this, "nmi", false);

    _6502_defineProperty(this, "brk", false);

    this.mem = mem;
    Object.seal(this);
  }

  push8(val) {
    val &= 0xff;
    const addr = 0x100 | this.sp;
    stack('push to: %s, val: %s', addr.to(16, 2), val.to(16));
    this.mem.w8({
      val,
      addr
    });
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
    return this.pull8() | this.pull8() << 8;
  }

  carry(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= CARRY;else this.stat &= ~CARRY;
    }

    return !!(this.stat & CARRY);
  }

  zero(val) {
    if (val !== undefined) {
      if ((val & 0xff) == 0) this.stat |= ZERO;else this.stat &= ~ZERO;
    }

    return !!(this.stat & ZERO);
  }

  interrupt(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= INTERRUPT;else this.stat &= ~INTERRUPT;
    }

    return !!(this.stat & INTERRUPT);
  }

  decimal(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= DECIMAL;else this.stat &= ~DECIMAL;
    }

    return !!(this.stat & DECIMAL);
  }

  overflow(cond) {
    if (cond !== undefined) {
      if (cond) this.stat |= OVERFLOW;else this.stat &= ~OVERFLOW;
    }

    return !!(this.stat & OVERFLOW);
  }

  sign(val) {
    if (val !== undefined) {
      if ((val & 0x80) > 0) this.stat |= SIGN;else this.stat &= ~SIGN;
    }

    return !!(this.stat & SIGN);
  }

  reset() {
    const addr = this.mem.r16(RESET_ADDR);
    _6502_debug('reset addr: %s', addr.to(16, 2));
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
      vector = NMI_ADDR;
      status = (status | 1 << 5) & ~(1 << 4);
      this.nmi = false;
    } else if (this.irq && !this.interrupt()) {
      vector = IRQ_BRK_ADDR;
      status = (status | 1 << 5) & ~(1 << 4);
      this.irq = false;
      this.interrupt(true);
    } else if (this.brk) {
      vector = IRQ_BRK_ADDR;
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

  decode() {
    const opcode = this.mem.r8(this.pc);
    const {
      mnemonic,
      ...inst
    } = instruction_set[opcode];
    _6502_debug('pc: %s, op: %s[%s]', this.pc.to(16, 2), opcode.to(16), mnemonic);
    return inst;
  }

  pageCrossedCycles({
    branchCycles,
    addr
  }) {
    return (this.pc & 0xff00) != (addr & 0xff00) ? branchCycles : 0;
  }

  runCycle() {
    const inst = this.decode();
    const {
      mode,
      bytes,
      cycles,
      branchCycles,
      execute
    } = inst;
    const operand = this.pc + 1;
    let addr;
    let totalCycles = cycles;

    switch (mode) {
      case ACC:
      case IMP:
        break;

      case REL:
      case IMM:
        addr = operand;
        break;

      case ABS:
        addr = this.mem.r16(operand);
        break;

      case ABS_X:
        addr = this.mem.r16(operand) + this.x;
        totalCycles += this.pageCrossedCycles({
          branchCycles,
          addr
        });
        break;

      case ABS_Y:
        addr = this.mem.r16(operand) + this.y;
        totalCycles += this.pageCrossedCycles({
          branchCycles,
          addr
        });
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

      case IND:
        {
          const laddr = this.mem.r16(operand);
          const haddr = laddr & 0xff00 | laddr + 1 & 0xff;
          addr = this.mem.r8(laddr) | this.mem.r8(haddr) << 8;
          break;
        }

      case IDX_IND:
        {
          const laddr = this.mem.r8(operand) + this.x & 0xff;
          const haddr = laddr + 1 & 0xff;
          addr = this.mem.r8(laddr) | this.mem.r8(haddr) << 8;
          break;
        }

      case IND_IDX:
        {
          const laddr = this.mem.r8(operand);
          const haddr = laddr + 1 & 0xff;
          addr = (this.mem.r8(laddr) | this.mem.r8(haddr) << 8) + this.y;
          totalCycles += this.pageCrossedCycles({
            branchCycles,
            addr
          });
          break;
        }

      case ZERO_PAGE:
        addr = this.mem.r8(operand);
        break;

      case ZERO_PAGE_X:
        addr = this.mem.r8(operand) + this.x & 0xff;
        break;

      case ZERO_PAGE_Y:
        addr = this.mem.r8(operand) + this.y & 0xff;
        break;

      default:
        throw new Error('Unknown addressing mode');
    }

    this.pc = this.pc + bytes & 0xffff;
    this.cycles += totalCycles;
    execute({ ...inst,
      cpu: this,
      mem: this.mem,
      addr,
      operand
    });
  }

}

;// CONCATENATED MODULE: ./src/ppu/memory.js


function ppu_memory_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }


class memory_Memory {
  constructor(nes) {
    ppu_memory_defineProperty(this, "nes", null);

    ppu_memory_defineProperty(this, "vram", [new Uint8Array(0x400), new Uint8Array(0x400)]);

    ppu_memory_defineProperty(this, "palette", new Uint8Array(0x20));

    this.nes = nes;
    Object.seal(this);
  }

  getNametable(addr) {
    if (this.nes.cart.mirroring) return addr >> 10 & 1;else return addr >> 11 & 1;
  }

  r8(addr) {
    switch (addr >> 12) {
      case 0x0:
      case 0x1:
        return this.nes.cart.r8(addr);

      case 0x2:
      case 0x3:
        if (addr < 0x3f00) {
          return this.vram[this.getNametable(addr)][addr & 0x3ff];
        } else {
          return this.palette[addr & 0x1f];
        }

      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }

  w8({
    val,
    addr
  }) {
    switch (addr >> 12) {
      case 0x0:
      case 0x1:
        {
          const table = addr >> 12 & 1;
          this.nes.video.updatePattern({
            table,
            val,
            addr
          });
          this.nes.cart.w8({
            val,
            addr
          });
          return;
        }

      case 0x2:
      case 0x3:
        {
          if (addr < 0x3f00) {
            const index = this.getNametable(addr);

            if ((addr & 0x3ff) < 0x3c0) {
              const nametable = this.nes.video.nametable[index];
              nametable[addr >> 5 & 0x1f][addr & 0x1f] = val;
            } else {
              const attribute = this.nes.video.attribute[index];
              const bits = attribute[addr >> 3 & 7][addr & 7];

              for (let i = 0; i < bits.length; i++) {
                bits[i] = val >> (i << 1) & 3;
              }
            }

            this.vram[index][addr & 0x3ff] = val;
          } else {
            const color = (addr & 3) - 1;

            if (addr == 0x3f00) {
              this.nes.video.bkgPalette = val;
            } else if (color > -1) {
              this.nes.video.palette[addr >> 2 & 7][color] = val;
            }

            this.palette[addr & 0x1f] = val;
          }

          return;
        }

      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }

}
;// CONCATENATED MODULE: ./src/ppu/index.js


function ppu_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }





const ppu_debug = debug('nes:ppu');
const REG_WRITE_IGNORE_WRITES_CYCLES = 29780;
const REG_WRITE_IGNORE = PPUCTRL | PPUMASK | PPUSCROLL;
class Ppu {
  // Registers
  // (x, y)
  constructor(nes) {
    ppu_defineProperty(this, "nes", null);

    ppu_defineProperty(this, "mem", null);

    ppu_defineProperty(this, "oam", new Uint8Array(0x100));

    ppu_defineProperty(this, "ctrl", 0);

    ppu_defineProperty(this, "mask", 0);

    ppu_defineProperty(this, "stat", 0);

    ppu_defineProperty(this, "scroll", [0, 0]);

    ppu_defineProperty(this, "scanline", 241);

    ppu_defineProperty(this, "cycles", 0);

    ppu_defineProperty(this, "resetCycles", 0);

    ppu_defineProperty(this, "resetIgnoreWrites", true);

    ppu_defineProperty(this, "writeCount", 0);

    ppu_defineProperty(this, "latch", 0);

    ppu_defineProperty(this, "oamAddr", 0);

    ppu_defineProperty(this, "vramAddr", 0);

    ppu_defineProperty(this, "renderFrame", false);

    ppu_defineProperty(this, "isOddFrame", true);

    this.nes = nes;
    this.mem = new memory_Memory(nes);
    Object.seal(this);
  }

  reset() {
    this.ctrl = 0;
    this.mask = 0;
    this.stat &= 0x80;
    this.scroll = [0, 0];
    this.cycles = 0;
    this.scanline = 0;
    this.resetCycles = 0;
    this.resetIgnoreWrites = true;
    this.writeCount = 0;
    this.latch = 0;
    this.vramAddr = 0;
    this.renderFrame = false;
    this.isOddFrame = false;
  }

  incrementVramAddress() {
    this.vramAddr += (this.ctrl & 4) === 0 ? 1 : 0x20;
    this.vramAddr &= 0x3fff;
  }

  step() {
    // After power/reset, writes to this register are ignored for about
    // 30,000 cycles.
    if (this.resetIgnoreWrites) {
      this.resetCycles++;

      if (this.resetCycles > REG_WRITE_IGNORE_WRITES_CYCLES) {
        this.resetCycles = 0;
        this.resetIgnoreWrites = false;
      }
    }

    if (this.cycles == 1) {
      if (this.scanline == 241) {
        this.nes.cpu.nmi = (this.ctrl & 0x80) > 0;
        this.stat |= 0x80; // vblank
      } else if (this.scanline == 261) {
        this.stat &= ~0xe0;
      }
    } else if (this.cycles == 339 && this.scanline == 261 && this.isOddFrame && this.mask & 0x18) {
      this.cycles++;
    }

    if (this.cycles == 340) {
      this.renderScanline();
      this.isOddFrame = !this.isOddFrame;
      this.cycles = -1;
    }

    this.cycles++;
  }

  renderScanline() {
    if (this.scanline < 240) {
      this.nes.video.drawLine();
    } else if (this.scanline == 261) {
      this.renderFrame = true;
      this.scanline = -1;
    }

    this.scanline++;
  }

  r8(addr) {
    ppu_debug('read at: %s', addr.to(16, 2));

    switch (0x2000 | addr & 0x7) {
      case PPUSTATUS:
        {
          // Reading the status register will clear bit 7 mentioned above and
          // also the address latch used by PPUSCROLL and PPUADDR. It does not
          // clear the sprite 0 hit or overflow bit.
          const stat = this.stat;
          this.stat &= ~0x80;
          this.writeCount = 0;
          this.latch = stat & 0xe0 | this.latch & 0x1f;
          break;
        }

      case OAMDATA:
        // TODO: Writes will increment OAMADDR after the write; reads during
        // vertical or forced blanking return the value from OAM at that
        // address but do not increment.
        this.latch = this.oam[this.oamAddr];
        break;

      case PPUDATA:
        this.latch = this.mem.r8({
          addr: this.vramAddr
        });
        this.incrementVramAddress();
        break;

      case PPUCTRL:
      case PPUMASK:
      case OAMADDR:
      case PPUSCROLL:
      case PPUADDR:
      default:
        break;
    }

    return this.latch;
  }

  w8({
    val,
    addr
  }) {
    const reg = addr & 0xf007;

    if (this.resetIgnoreWrites && reg & REG_WRITE_IGNORE) {
      ppu_debug('write at: %s ignored', reg.to(16, 2));
      return;
    }

    val &= 0xff;
    ppu_debug('write at: %s, val: %s', addr.to(16, 2), val.to(16));
    this.latch = val;

    if (addr == OAMDMA) {
      for (let i = 0; i < 0x100; i++) {
        const byte = this.nes.cpu.mem.r8(val << 8 | i);
        this.nes.video.sprites[i >> 2][i & 3] = this.oam[i] = byte;
      }

      this.nes.cpu.haltCycles += 513;
      return;
    }

    switch (reg) {
      case PPUCTRL:
        this.ctrl = val;
        return;

      case PPUMASK:
        this.mask = val;
        return;

      case OAMADDR:
        this.oamAddr = val;
        return;

      case OAMDATA:
        {
          const addr = this.oamAddr++;
          this.nes.video.sprites[addr >> 2][addr & 3] = this.oam[addr] = val;
          this.oamAddr &= 0xff;
          return;
        }

      case PPUSCROLL:
        // Horizontal offsets range from 0 to 255. "Normal" vertical offsets
        // range from 0 to 239, while values of 240 to 255 are treated as -16
        // through -1 in a way, but tile data is incorrectly fetched from the
        // attribute table.
        this.scroll[this.writeCount++] = val;
        this.writeCount &= 1;
        return;

      case PPUADDR:
        if (this.writeCount === 0) {
          this.vramAddr = val << 8;
        } else {
          this.vramAddr |= val;
        }

        this.vramAddr &= 0x3fff;
        this.writeCount++;
        this.writeCount &= 1;
        return;

      case PPUDATA:
        this.mem.w8({
          val,
          addr: this.vramAddr
        });
        this.incrementVramAddress();
        return;

      default:
        break;
    }

    throw new UnmappedAddressError(addr);
  }

}
;// CONCATENATED MODULE: ./src/shims/canvas.js


const createCanvas = function (width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
;// CONCATENATED MODULE: ./src/video/palette.js


// prettier-ignore
/* harmony default export */ const palette = ([[0x7c, 0x7c, 0x7c], [0x00, 0x00, 0xfc], [0x00, 0x00, 0xbc], [0x44, 0x28, 0xbc], [0x94, 0x00, 0x84], [0xa8, 0x00, 0x20], [0xa8, 0x10, 0x00], [0x88, 0x14, 0x00], [0x50, 0x30, 0x00], [0x00, 0x78, 0x00], [0x00, 0x68, 0x00], [0x00, 0x58, 0x00], [0x00, 0x40, 0x58], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00], [0xbc, 0xbc, 0xbc], [0x00, 0x78, 0xf8], [0x00, 0x58, 0xf8], [0x68, 0x44, 0xfc], [0xd8, 0x00, 0xcc], [0xe4, 0x00, 0x58], [0xf8, 0x38, 0x00], [0xe4, 0x5c, 0x10], [0xac, 0x7c, 0x00], [0x00, 0xb8, 0x00], [0x00, 0xa8, 0x00], [0x00, 0xa8, 0x44], [0x00, 0x88, 0x88], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00], [0xf8, 0xf8, 0xf8], [0x3c, 0xbc, 0xfc], [0x68, 0x88, 0xfc], [0x98, 0x78, 0xf8], [0xf8, 0x78, 0xf8], [0xf8, 0x58, 0x98], [0xf8, 0x78, 0x58], [0xfc, 0xa0, 0x44], [0xf8, 0xb8, 0x00], [0xb8, 0xf8, 0x18], [0x58, 0xd8, 0x54], [0x58, 0xf8, 0x98], [0x00, 0xe8, 0xd8], [0x78, 0x78, 0x78], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00], [0xfc, 0xfc, 0xfc], [0xa4, 0xe4, 0xfc], [0xb8, 0xb8, 0xf8], [0xd8, 0xb8, 0xf8], [0xf8, 0xb8, 0xf8], [0xf8, 0xa4, 0xc0], [0xf0, 0xd0, 0xb0], [0xfc, 0xe0, 0xa8], [0xf8, 0xd8, 0x78], [0xd8, 0xf8, 0x78], [0xb8, 0xf8, 0xb8], [0xb8, 0xf8, 0xd8], [0x00, 0xfc, 0xfc], [0xf8, 0xd8, 0xf8], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00]]);
;// CONCATENATED MODULE: ./src/video/index.js


function video_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




const video_debug = debug('nes:video');
const FRAME_WIDTH = 256;
const FRAME_HEIGHT = 240;
const OAM_SPRITE_X = 3;
const OAM_SPRITE_Y = 0;
const OAM_SPRITE_INDEX = 1;
const OAM_SPRITE_ATTR = 2;
class Video {
  constructor(nes, showFps, onFrame) {
    video_defineProperty(this, "nes", null);

    video_defineProperty(this, "showFps", false);

    video_defineProperty(this, "onFrame", () => {});

    video_defineProperty(this, "fps", 0);

    video_defineProperty(this, "bkgPalette", 0);

    video_defineProperty(this, "linePtrn", new Array(FRAME_WIDTH).fill(0));

    video_defineProperty(this, "lineColor", new Array(FRAME_WIDTH));

    video_defineProperty(this, "canvas", createCanvas(FRAME_WIDTH, FRAME_HEIGHT));

    video_defineProperty(this, "ctx", this.canvas.getContext('2d', {
      alpha: false,
      pixelFormat: 'RGB24'
    }));

    video_defineProperty(this, "image", this.ctx.getImageData(0, 0, FRAME_WIDTH, FRAME_HEIGHT));

    video_defineProperty(this, "data", this.image.data);

    video_defineProperty(this, "nametable", new Array(2).fill().map(() => {
      return new Array(30).fill().map(() => new Uint8Array(32));
    }));

    video_defineProperty(this, "attribute", new Array(2).fill().map(() => {
      return new Array(8).fill().map(() => {
        return new Array(8).fill().map(() => new Array(4).fill(0));
      });
    }));

    video_defineProperty(this, "pattern", new Array(2).fill().map(() => {
      return new Array(0x100).fill().map(() => {
        return new Array(8).fill().map(() => new Uint8Array(8));
      });
    }));

    video_defineProperty(this, "palette", new Array(8).fill().map(() => new Array(3).fill(0)));

    video_defineProperty(this, "sprites", new Array(64).fill().map(() => new Uint8Array(4)));

    this.nes = nes;
    this.showFps = showFps;
    this.onFrame = onFrame;
    this.ctx.patternQuality = 'fast';
    this.ctx.quality = 'fast';
    this.ctx.textDrawingMode = 'path';
    this.ctx.antialias = 'none';
    this.ctx.font = '10px Lucida Console';
    this.ctx.textAlign = 'end';
    this.ctx.textBaseline = 'top';
    this.ctx.fillStyle = '#00ff00';
    Object.seal(this);
  }

  updatePattern({
    table,
    val,
    addr
  }) {
    const row = this.pattern[table][addr >> 4 & 0xff][addr & 7];
    const plane = addr >> 3 & 1;

    for (let i = 0; i < row.length; i++) {
      const col = 7 - i;
      if (!plane) row[col] = 0;
      row[col] |= (val >> i & 1) << plane;
    }
  }

  drawBackground() {
    const {
      ppu,
      cart
    } = this.nes;
    const [xscroll, yscroll] = ppu.scroll;
    const yoffset = yscroll + ppu.scanline;
    const ysprite = yoffset & 7;
    const row = (yoffset >> 3) % 30;
    let table = (ppu.ctrl & 3) >> 1;
    if (!cart.mirroring && yoffset >= FRAME_HEIGHT) table = ++table & 1;
    const nametable = this.nametable[table];
    const attrtable = this.attribute[table];
    const ptrntable = this.pattern[(ppu.ctrl & 0x10) >> 4];
    const maskoffset = (ppu.mask & 2) << 2 ^ 8;

    for (let x = maskoffset; x < FRAME_WIDTH; x++) {
      const xoffset = xscroll + x;
      const col = xoffset >> 3 & 0x1f;
      const tile = nametable[row][col];
      const ptrn = this.linePtrn[x] = ptrntable[tile][ysprite][xoffset & 7];
      if (!ptrn) continue;
      const attr = attrtable[row >> 2][col >> 2];
      const color = this.palette[attr[row & 2 | col >> 1 & 1]][ptrn - 1];
      this.lineColor[x] = color;
    }
  }

  drawSprites() {
    const {
      ppu
    } = this.nes;
    const ptrntable = this.pattern[(ppu.ctrl & 8) >> 3]; // const size = (ppu.ctrl & 0x20) >> 5;

    let indexes = [];

    for (let i = 0; i < this.sprites.length; i++) {
      if (ppu.scanline > this.sprites[i][OAM_SPRITE_Y] && ppu.scanline <= this.sprites[i][OAM_SPRITE_Y] + 8 && this.sprites[i][OAM_SPRITE_Y] < 0xef) indexes.push(i);
    }

    if (indexes.length > 8) ppu.stat |= 0x20;
    const masked = (ppu.mask >> 1 & 3 ^ 3) > 0;

    for (let i = Math.min(8, indexes.length) - 1; i > -1; i--) {
      const s = this.sprites[indexes[i]];
      const priority = s[OAM_SPRITE_ATTR] >> 5 & 1;
      const xflip = s[OAM_SPRITE_ATTR] >> 6 & 1;
      const yflip = s[OAM_SPRITE_ATTR] >> 7;
      const sx = s[OAM_SPRITE_X];
      const sy = ppu.scanline - s[OAM_SPRITE_Y] - 1;
      const py = yflip ? 7 - sy : sy;

      for (let x = sx; x < sx + 8 && x < FRAME_WIDTH; x++) {
        const px = xflip ? 7 - (x - sx) : x - sx;
        const ptrn = ptrntable[s[OAM_SPRITE_INDEX]][py][px];
        if (!ptrn) continue;
        const color = this.palette[4 | s[OAM_SPRITE_ATTR] & 3][ptrn - 1];

        if (!indexes[i] && color && this.linePtrn[x]) {
          if (x > 7 && x < 255 || x < 7 && !masked // && ppu.scanline < 239
          ) ppu.stat |= 0x40;
        }

        if (!priority || !this.linePtrn[x]) this.lineColor[x] = color;
      }
    }
  }

  drawLine() {
    const {
      ppu
    } = this.nes;
    video_debug('drawing scanline: %d', ppu.scanline);
    this.linePtrn.fill(0);
    this.lineColor.fill(this.bkgPalette);
    if (ppu.mask & 8) this.drawBackground();
    if (ppu.mask & 0x10) this.drawSprites();
    let offset = ppu.scanline * FRAME_WIDTH * 4;

    for (let x = 0; x < FRAME_WIDTH; x++) {
      this.data[offset++] = palette[this.lineColor[x]][0];
      this.data[offset++] = palette[this.lineColor[x]][1];
      this.data[offset++] = palette[this.lineColor[x]][2];
      this.data[offset++] = 255;
    }
  }

  render() {
    this.ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    this.ctx.putImageData(this.image, 0, 0);

    if (this.showFps) {
      if (!(this.nes.frameCount % 15)) this.fps = Math.floor(this.nes.fps);
      this.ctx.fillText(this.fps, FRAME_WIDTH - 5, 5);
    }

    this.onFrame(this.canvas);
  }

}
;// CONCATENATED MODULE: ./src/controller.js


function controller_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const BUTTON_A = 0;
const BUTTON_B = 1;
const BUTTON_SELECT = 2;
const BUTTON_START = 3;
const BUTTON_UP = 4;
const BUTTON_DOWN = 5;
const BUTTON_LEFT = 6;
const BUTTON_RIGHT = 7;
const keys = {
  40: BUTTON_DOWN,
  13: BUTTON_START,
  38: BUTTON_UP,
  16: BUTTON_SELECT,
  37: BUTTON_LEFT,
  90: BUTTON_B,
  39: BUTTON_RIGHT,
  88: BUTTON_A
};
class Controller {
  constructor() {
    controller_defineProperty(this, "state", new Array(8).fill(0x40));

    controller_defineProperty(this, "strobe", 0);

    controller_defineProperty(this, "bit", 0);

    Object.seal(this);
  }

  write(val) {
    if (!this.strobe) this.bit = 0;
    this.strobe = val & 1;
  }

  read() {
    if (this.bit > 8) return 0x41;
    return this.state[this.bit++];
  }

  keyDown(code) {
    if (keys[code] == undefined) return;
    this.state[keys[code]] = 0x41;
  }

  keyUp(code) {
    if (keys[code] == undefined) return;
    this.state[keys[code]] = 0x40;
  }

}
;// CONCATENATED MODULE: ./src/nes.js


function nes_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }










const nes_debug = debug('nes');
class Nes {
  constructor({
    showFps,
    onFrame
  }) {
    nes_defineProperty(this, "video", null);

    nes_defineProperty(this, "cart", new Cart(this));

    nes_defineProperty(this, "ppu", new Ppu(this));

    nes_defineProperty(this, "cpu", new MOS6502(new Memory(this)));

    nes_defineProperty(this, "controller", new Controller());

    nes_defineProperty(this, "loop", null);

    nes_defineProperty(this, "frameCycles", 0);

    nes_defineProperty(this, "frameCount", 0);

    nes_defineProperty(this, "fps", 0);

    this.video = new Video(this, showFps, onFrame);
    Object.seal(this);
  }

  loadCart(buf) {
    nes_debug('loading cart');
    this.cart.load(new Uint8Array(buf));
  }

  runFrame() {
    let cycles;

    FRAMELOOP: for (;;) {
      cycles = this.cpu.step();
      this.frameCycles += cycles;

      for (cycles *= 3; cycles > 0; cycles--) {
        this.ppu.step();

        if (this.ppu.renderFrame) {
          break FRAMELOOP;
        }
      }
    }

    this.ppu.renderFrame = false;
    this.video.render();
    nes_debug('frame: %d, cycles: %d, pc: %s', this.frameCount, this.frameCycles, this.cpu.pc.to(16));
    this.frameCount = ++this.frameCount % 60;
    this.frameCycles = 0;
  }

  start() {
    nes_debug('start');
    this.cpu.reset();
    this.ppu.reset();
    let lastTime = performance_now_default()();

    const loop = () => {
      const currentTime = performance_now_default()();
      this.fps = 1000 / (currentTime - lastTime);
      lastTime = currentTime;
      this.runFrame();
      this.loop = raf_default()(loop);
    };

    this.loop = raf_default()(loop);
  }

}

/***/ }),

/***/ 593:
/***/ (() => {

"use strict";


Number.prototype.to = function () {};

/***/ }),

/***/ 75:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/* provided dependency */ var process = __webpack_require__(155);
// Generated by CoffeeScript 1.12.2
(function() {
  var getNanoSeconds, hrtime, loadTime, moduleLoadTime, nodeLoadTime, upTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - nodeLoadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    moduleLoadTime = getNanoSeconds();
    upTime = process.uptime() * 1e9;
    nodeLoadTime = moduleLoadTime - upTime;
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

//# sourceMappingURL=performance-now.js.map


/***/ }),

/***/ 155:
/***/ ((module) => {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),

/***/ 87:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var now = __webpack_require__(407)
  , root = typeof window === 'undefined' ? __webpack_require__.g : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = root['request' + suffix]
  , caf = root['cancel' + suffix] || root['cancelRequest' + suffix]

for(var i = 0; !raf && i < vendors.length; i++) {
  raf = root[vendors[i] + 'Request' + suffix]
  caf = root[vendors[i] + 'Cancel' + suffix]
      || root[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf.call(root, fn)
}
module.exports.cancel = function() {
  caf.apply(root, arguments)
}
module.exports.polyfill = function(object) {
  if (!object) {
    object = root;
  }
  object.requestAnimationFrame = raf
  object.cancelAnimationFrame = caf
}


/***/ }),

/***/ 407:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/* provided dependency */ var process = __webpack_require__(155);
// Generated by CoffeeScript 1.12.2
(function() {
  var getNanoSeconds, hrtime, loadTime, moduleLoadTime, nodeLoadTime, upTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - nodeLoadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    moduleLoadTime = getNanoSeconds();
    upTime = process.uptime() * 1e9;
    nodeLoadTime = moduleLoadTime - upTime;
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

//# sourceMappingURL=performance-now.js.map


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(679);
/******/ })()
.default;