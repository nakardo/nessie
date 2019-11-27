// localStorage.debug = '';

var nes = (window.nes = new window.Nes());

// Buttons

function loadFile() {
  if (!this.files.length) return;

  var reader = new FileReader();
  reader.onloadend = function() {
    nes.loadCart(reader.result);
    nes.start();
  };
  reader.onerror = function(e) {
    console.error(e);
  };
  reader.readAsArrayBuffer(this.files[0]);
}

$('#input').change(loadFile);
