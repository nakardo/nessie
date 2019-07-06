import {debug as Debug} from 'debug';

const debug = Debug('nes:screen');

export default class Screen {
  canvas = null;

  constructor(canvas) {
    this.canvas = canvas;
  }

  drawLine(scanline) {}
  render() {}
}
