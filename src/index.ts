import * as OSC from 'node-osc';
import * as LP from 'launchpad-mini';
const Launchpad = require('launchpad-mini');

interface Record {
    x: number;
    y: number;
    note: number;
    pressed: boolean;
}

class Pad {
    pad: LP.Launchpad;
    osc: OSC.Client;

    isMixer: boolean = false;
    isHold: boolean = false;

    // Sequencer
    isTapping: boolean = false;
    isLooping: boolean = false;
    isWriting: boolean = false;
    isErasing: boolean = false;
    lastTap = 0;
    loopLength = 0;
    loopStart = 0;
    frameIndex = 0;
    loopTimer?: NodeJS.Timeout;
    records: Record[][] = [];

    cc = [0, 0, 0, 0, 0, 0, 0, 0];
    note = [
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
    ];

    constructor(port: number) {
        this.pad = new Launchpad();
        this.osc = new OSC.Client('127.0.0.1', port);
    }

    start() {
        this.pad.connect().then(() => {
            this.pad.reset(0);
            this.pad.on('key', (k: any) => this.onKey(k));
        });
    }

    stop() {
        this.pad.disconnect();
        this.osc.kill();
    }

    onKey(k: LP.ButtonLikeArray) {
        // console.log(k);

        if (k.x === 7 && k.y === 8) {
            if (k.pressed) {
                this.isMixer = !this.isMixer;
                if (this.isMixer) { this.showMixer(); }
                else { this.showPad(); }
            }

            const col: LP.Color = k.pressed ? this.pad.red : this.isMixer ? this.pad.green : this.pad.off;
            this.pad.col(col, k);
        }

        if (this.isMixer) {
            this.onKeyMixer(k);
        }
        else {
            this.onKeyPad(k);
        }
    }

    onKeyMixer(k: LP.ButtonLikeArray) {
        if (k.y === 8) {
            const offButtons: number[][] = [];
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

    onKeyPad(k: LP.ButtonLikeArray) {
        if (k.y === 8) { return; }

        if (k.x === 8) {
            if (k.y === 8) {
                // Doesn't exist
                return;
            }
            if (k.y === 0) {
                // Hold button is a momentary button
                this.isHold = k.pressed;
            }
            if (k.y === 1) {
                // Write button is a momentary button
                this.isWriting = k.pressed;
            }
            if (k.y === 2) {
                // Erase button is a momentary button
                this.isErasing = k.pressed;
            }
            if (k.y === 6 && k.pressed) {
                // Loop button is a toggle button
                if (!this.isLooping) {
                    this.startLoop();
                    this.pad.col(this.pad.green, k);
                }
                else {
                    this.stopLoop();
                    this.pad.col(this.pad.off, k);
                }
            }
            else if (k.y === 7 && k.pressed) {
                // Tap button is a toggle button
                if (!this.isTapping) {
                    // Start tapping
                    this.lastTap = Date.now();
                    this.pad.col(this.pad.red, k);
                }
                else {
                    // Do nothing if the length is too short
                    const l = Date.now() - this.lastTap;
                    if (l > 500) {
                        // Stop tapping
                        this.loopLength = l;
                        this.pad.col(this.pad.off, k);

                        if (!this.isLooping) {
                            this.isLooping = true;
                            this.startLoop();
                        }
                    }
                }
                this.isTapping = !this.isTapping;
            }
        }
        else {
            const noteNumber = k.y * 8 + k.x;

            const note = this.note[noteNumber];
            let newNote = note;

            if (this.isWriting) {
                const newRecord = this.records[this.frameIndex] || [];
                newRecord.push({ x: k.x, y: k.y, note: noteNumber, pressed: k.pressed });
                this.records[this.frameIndex] = newRecord;
            }
            else if (this.isErasing) {
                this.records.forEach((records, i) => {
                    if (records) {
                        this.records[i] = records.filter(r => r.note !== noteNumber);
                    }
                });
            }
            else if (this.isHold) {
                if (k.pressed) {
                    newNote = note ? 0 : 0.5; // off or holded
                }
            }
            else {
                if (note !== 0.5) {
                    // momentary
                    newNote = k.pressed ? 1 : 0; // on or off
                }
            }

            this.note[noteNumber] = newNote;

            const color = k.pressed ? this.pad.red :
                (newNote == 1) ? this.pad.yellow :
                    (newNote == 0.5) ? this.pad.green : this.pad.off;

            this.pad.col(color, k);
            this.osc.send('/note', this.note);
        }
    }

    showMixer() {
        const onButtons: LP.ButtonXY[] = [];

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
        const onButtons: LP.ButtonXY[] = [];
        const holdButtons: LP.ButtonXY[] = [];
        this.pad.reset(0);

        this.note.forEach((n, i) => {
            if (n == 0) { return; }
            const x = i % 8;
            const y = Math.floor(i / 8);

            if (n == 1) {
                holdButtons.push([x, y]);
            } else {
                onButtons.push([x, y]);
            }
        });

        this.pad.reset(0);
        this.pad.col(this.pad.green, onButtons);
        this.pad.col(this.pad.yellow, holdButtons);
    }

    startLoop() {
        this.loopStart = Date.now();
        this.frameIndex = 0;

        let isBlinking = false;

        this.loopTimer = setInterval(() => {
            if (!this.isTapping) {
                const now = Date.now();
                if (now - this.loopStart > this.loopLength) {
                    this.loopStart = now;
                    this.frameIndex = 0;
                    this.pad.col(this.pad.red, [8, 7]);
                    isBlinking = true;
                }
                else if (isBlinking) {
                    this.pad.col(this.pad.off, [8, 7]);
                    isBlinking = false;
                }
            }

            const record = this.records[this.frameIndex];
            if (record) {
                const onButtons: LP.ButtonXY[] = [];
                const offButtons: LP.ButtonXY[] = [];

                record.forEach(e => {
                    this.note[e.note] = e.pressed ? 0.75 : 0;
                    if (e.pressed) {
                        onButtons.push([e.x, e.y]);
                    }
                    else {
                        offButtons.push([e.x, e.y]);
                    }
                });

                this.osc.send('/note', this.note);
                this.pad.col(this.pad.green, onButtons);
                this.pad.col(this.pad.amber, offButtons);
            }

            this.frameIndex++
        }, 30); // almost 30fps
    }

    stopLoop() {
        if (this.loopTimer) {
            clearInterval(this.loopTimer);
            this.pad.col(this.pad.off, [8, 7]);
        }
    }
}

module.exports = Pad;
