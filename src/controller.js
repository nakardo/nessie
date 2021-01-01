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
  88: BUTTON_A,
};

export default class Controller {
  state = new Array(8).fill(0x40);
  strobe = 0;
  bit = 0;

  constructor() {
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
