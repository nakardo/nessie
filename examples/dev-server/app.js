/* global $:readonly */

import Nes from '../../src/nes';

const canvas = $('#frame').get(0);
const ctx = canvas.getContext('2d');
const nes = new Nes({
  showFps: true,
  onFrame(canvas) {
    ctx.drawImage(canvas, 0, 0);
  },
});

// Buttons

$('#input').change(function () {
  if (!this.files.length) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    nes.loadCart(reader.result);
    nes.start();
  };
  reader.onerror = console.error;
  reader.readAsArrayBuffer(this.files[0]);
});

// Controller
$(document).keydown((e) => nes.controller.keyDown(e.keyCode));
$(document).keyup((e) => nes.controller.keyUp(e.keyCode));
