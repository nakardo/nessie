const fs = require('fs');
const Nes = require('./src/nes');

const nes = new Nes();
// Passing:
// - 01-basics.nes
// - 02-implied.nes
// - 03-immediate.nes
// - 04-zero_page.nes
// - 05-zp_xy.nes
// - 06-absolute.nes
// - 10-branches.nes
//
// Failing:
// - 07-abs_xy.nes (Unimplemented opcode: 0x02)
// - 08-ind_x.nes (UnmappedAddressError: 0xa5ff is an unknown address)
// - 09-ind_y.nes (UnmappedAddressError: 0xffff is an unknown address)
nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/07-abs_xy.nes'));
nes.start();
