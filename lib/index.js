"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OSC = require("node-osc");
const Launchpad = require('launchpad-mini');
class Pad {
    constructor(port) {
        this.isMixer = false;
        this.isHold = false;
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
        this.pad = new Launchpad();
        this.osc = new OSC.Client('127.0.0.1', port);
    }
    start() {
        this.pad.connect().then(() => {
            this.pad.reset(0);
            this.pad.on('key', (k) => this.onKey(k));
        });
    }
    stop() {
        this.pad.disconnect();
        this.osc.kill();
    }
    onKey(k) {
        console.log(k);
        if (k.x === 7 && k.y === 8) {
            if (k.pressed) {
                this.isMixer = !this.isMixer;
                if (this.isMixer) {
                    this.showMixer();
                }
                else {
                    this.showPad();
                }
            }
            const col = k.pressed ? this.pad.red : this.isMixer ? this.pad.green : this.pad.off;
            this.pad.col(col, k);
        }
        if (this.isMixer) {
            this.onKeyMixer(k);
        }
        else {
            this.onKeyPad(k);
        }
    }
    onKeyMixer(k) {
        if (k.y === 8) {
            const offButtons = [];
            for (let i = 0; i < 8; i++) {
                offButtons.push([k.x, i]);
            }
            this.pad.col(this.pad.off, offButtons);
            this.cc[k.x] = 0;
        }
        if (k.x < 8 && k.y < 8) {
            const y = (8 - k.y);
            const onButtons = [];
            for (let i = k.y; i < 8; i++) {
                onButtons.push([k.x, i]);
            }
            this.pad.col(k.pressed ? this.pad.red : this.pad.green, onButtons);
            const offButtons = [];
            for (let i = 0; i < k.y; i++) {
                offButtons.push([k.x, i]);
            }
            this.pad.col(this.pad.off, offButtons);
            this.cc[k.x] = y / 8.0;
        }
        this.osc.send('/cc', this.cc);
    }
    onKeyPad(k) {
        if (k.x === 8) {
            this.isHold = k.pressed;
        }
        if (k.x === 8 || k.y === 8) {
            return;
        }
        const i = k.y * 8 + k.x;
        const note = this.note[i];
        let newNote = note;
        if (this.isHold) {
            if (k.pressed) {
                newNote = note ? 0 : 0.5;
            }
        }
        else {
            if (note !== 0.5) {
                newNote = k.pressed ? 1 : 0;
            }
        }
        this.note[i] = newNote;
        const color = k.pressed ? this.pad.red :
            (newNote == 1) ? this.pad.yellow :
                (newNote == 0.5) ? this.pad.green : this.pad.off;
        this.pad.col(color, k);
        this.osc.send('/note', this.note);
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
        const holdButtons = [];
        this.pad.reset(0);
        this.note.forEach((n, i) => {
            if (n == 0) {
                return;
            }
            const x = i % 8;
            const y = Math.floor(i / 8);
            if (n == 1) {
                holdButtons.push([x, y]);
            }
            else {
                onButtons.push([x, y]);
            }
        });
        this.pad.reset(0);
        this.pad.col(this.pad.green, onButtons);
        this.pad.col(this.pad.yellow, holdButtons);
    }
}
module.exports = Pad;
