export default class Oam {
  mem = new Uint8Array(0x100);
  addr = 0;

  r8() {
    return this.mem[this.addr];
  }

  w8(val) {
    this.oam[this.addr++] = val;
    this.addr &= 0xff;
  }
}
