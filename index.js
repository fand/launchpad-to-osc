const OSC = require('node-osc');
const Launchpad = require('launchpad-mini');

class Pad {
  constructor(port) {
    this.pad = new Launchpad();
    this.osc = new OSC.Client('127.0.0.1', 3333);

    this.cc = [0, 0, 0, 0, 0, 0, 0, 0];
    this.note = [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ];

    this.isMixer = false;
    this.isHold = false;
  }

  start() {
    this.pad.connect().then(() => {
      this.pad.reset(0);
      this.pad.on('key', k => this.onKey(k));
    });
  }

  stop() {
    this.pad.disconnect();
    this.osc.kill();
  }

  onKey(k) {
    console.log(k);
    const x = k.x;

    if (k.x === 7 && k.y === 8) {
      if (k.pressed) {
        this.isMixer = !this.isMixer;
        if (this.isMixer) { this.showMixer(); }
        else { this.showPad(); }
      }

      this.pad.col(k.pressed ? this.pad.red : this.isMixer ? this.pad.green : this.pad.off, k);
    }

    if (k.y === 8) {
      const offButtons = [];
      for (let i = 0; i < 8; i++) {
        offButtons.push([x, i]);
      }
      this.pad.col(this.pad.off, offButtons);

      this.cc[x] = 0;
    }
    if (k.x < 8 && k.y < 8) {
      const y = (8 - k.y);

      const onButtons = [];
      for (let i = k.y; i < 8; i++) {
        onButtons.push([x, i]);
      }
      this.pad.col(k.pressed ? this.pad.red : this.pad.green, onButtons);

      const offButtons = [];
      for (let i = 0; i < k.y; i++) {
        offButtons.push([x, i]);
      }
      this.pad.col(this.pad.off, offButtons);

      this.cc[x] = y / 8.0;
    }

    this.sendMixer();
  }

  sendMixer() {
    // console.log(this.cc);
    this.osc.send('/cc', this.cc);
  }

  showMixer() {
    const onButtons = [];

    this.cc.forEach((c, x) => {
      const height = c * 8.;
      for (let y = 0; y < height; y++) {
        onButtons.push([x, 7 - y]);
      }
    });
    this.pad.reset(0);
    this.pad.col(this.pad.green, onButtons);
  }

  showPad() {
    const onButtons = [];
    this.pad.reset(0);

    this.note.forEach((n, i) => {
      if (n == 0) { return; }
      const x = i % 8;
      const y = Math.floor(i / 8);
      onButtons.push([i, y]);
    });

    this.pad.reset(0);
    this.pad.col(this.pad.green, onButtons);
  }
}

const p = new Pad(3333);
p.start();

//do something when app is closing
process.on('exit', () => {
  p.close();
  process.exit();
});
