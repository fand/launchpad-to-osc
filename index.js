const OSC = require('node-osc');
const osc = new OSC.Client('127.0.0.1', 3333);

const Launchpad = require('launchpad-mini');
const pad = new Launchpad();

const cc = [0, 0, 0, 0, 0, 0, 0, 0];

pad.connect().then(() => {
  pad.reset(0);
  pad.on('key', k => {
    // console.log(k);
    const x = k.x;

    if (k.y === 8) {
      const offButtons = [];
      for (let i = 0; i < 8; i++) {
        offButtons.push([x, i]);
      }
      pad.col(pad.off, offButtons);

      cc[x] = 0;
    }
    if (k.x < 8 && k.y < 8) {
      const y = (8 - k.y);

      const onButtons = [];
      for (let i = k.y; i < 8; i++) {
        onButtons.push([x, i]);
      }
      pad.col(k.pressed ? pad.red : pad.green, onButtons);

      const offButtons = [];
      for (let i = 0; i < k.y; i++) {
        offButtons.push([x, i]);
      }
      pad.col(pad.off, offButtons);

      cc[x] = y / 8.0;
    }

    console.log(cc);
    osc.send('/cc', cc);
  });
});

//do something when app is closing
process.on('exit', () => {
  osc.kill();
  pad.disconnect();
  process.exit();
});
