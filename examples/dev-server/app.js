import Nes from '../../src/nes';

const canvas = document.getElementById('frame');
const ctx = canvas.getContext('2d');
const nes = (window.nes = new Nes({
  onFrame(canvas) {
    ctx.drawImage(canvas, 0, 0);
  },
}));

document.getElementById('fullscreen').addEventListener('click', () => {
  (
    canvas.requestFullscreen ||
    canvas.mozRequestFullScreen ||
    canvas.webkitRequestFullscreen ||
    canvas.msRequestFullscreen
  ).call(canvas);
});

// Buttons
document.getElementById('input').addEventListener('change', (evt) => {
  evt.currentTarget.focus();
  evt.currentTarget.blur();

  const files = evt.target.files;
  if (!files.length) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    nes.reset();
    nes.loadCart(reader.result);
    nes.start();
  };
  reader.onerror = console.error;
  reader.readAsArrayBuffer(files[0]);
});

// Controller
document.addEventListener('keydown', (e) => nes.controller.keyDown(e.keyCode));
document.addEventListener('keyup', (e) => nes.controller.keyUp(e.keyCode));
