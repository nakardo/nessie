'use strict';

const fs = require('fs');
const Nes = require('./src/nes');

const nes = new Nes();
// Single tests:
//
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/01-basics.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/02-implied.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/03-immediate.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/04-zero_page.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/05-zp_xy.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/06-absolute.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/07-abs_xy.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/08-ind_x.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/09-ind_y.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/10-branches.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/11-stack.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/12-jmp_jsr.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/13-rts.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/14-rti.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/15-brk.nes'));
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/16-special.nes'));
//
// All tests:
// nes.loadCart(fs.readFileSync('./roms/instr_test-v5/all_instrs.nes'));
nes.loadCart(fs.readFileSync('./roms/instr_test-v5/official_only.nes'));
//
// Roms:
// nes.loadCart(fs.readFileSync('./roms/excitebike.nes'));
nes.start();
