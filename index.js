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
// - 07-abs_xy.nes
// - 08-ind_x.nes
// - 09-ind_y.nes
// - 10-branches.nes
// - 11-stack.nes
// - 12-jmp_jsr.nes
// - 13-rts.nes
// - 14-rti.nes
// - 15-brk.nes
// - 16-special.nes
nes.loadCart(fs.readFileSync('./roms/instr_test-v5/rom_singles/09-ind_y.nes'));
nes.start();
