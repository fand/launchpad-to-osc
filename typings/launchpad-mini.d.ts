declare module 'launchpad-mini' {
    import { EventEmitter } from "events";

    export class Color {
        constructor(level: number, clear: number, copy: number, name: string);
        off(): Color;
        low(): Color;
        medium(): Color;
        full(): Color;
        level(n: number): Color;
        clear(): Color;
        copy(): Color;
        code(): number;
    }

    // Workaround for Launchpad.Colors.Color to make it new-able.
    // because it's the class itself, not an instance of Color.
    interface ColorConstructor {
        new(level: number, clear: number, copy: number, name: string): Color;
    }

    interface Colors {
        Color: ColorConstructor;
        red: Color;
        green: Color;
        amber: Color;
        yellow: Color;
        off: Color;
    }

    export interface Button {
        pressed: boolean;
        x: number;
        y: number;
        cmd: number;
        key: number;
        id: symbol;
    }

    // Button which pretends to be an array.
    // This type of objects are passed to the listeners on 'key' events.
    export interface ButtonLikeArray extends Button {
        0: number;
        1: number;
        length: 2;
    }

    // XY Coordinate of buttons
    export type ButtonXY = [number, number];

    interface Buttons {
        All: Button[];
        Grid: Button[];
        Automap: Button[];
        Scene: Button[];
        byId: (id: symbol) => Button;
        byXy: (xy: ButtonXY) => Button;
    }

    type MidiMessage = [number, number, number];

    // Workaround to override types on EventEmitter methods
    class EventEmitterWeak extends EventEmitter {
        on(event: any, listener: any): any;
        off: any;
    }

    type LaunchpadEvent = 'connect' | 'disconnect' | 'key';

    export class Launchpad extends EventEmitterWeak {
        constructor();

        on(event: LaunchpadEvent, listener: (key: ButtonLikeArray | void) => void): void;

        midiIn: any;
        midiOut: any;
        private _buttons: Button[];
        private _writeBuffer: number;
        private _displayBuffer: number;
        private _flashing: boolean;
        red: Color;
        green: Color;
        amber: Color;
        yellow: Color;
        off: Color;

        connect(port?: number): Promise<string>;
        disconnect(): void;

        reset(brighness?: number): void;
        sendRaw(data: number[]): void;

        isPressed(button: number[]): boolean;

        col(color: number | Color, buttons: number[] | number[][] | ButtonLikeArray | ButtonLikeArray[]): Promise<void | boolean>;

        setColors(buttonsWithColor: [number, number, Color][]): Promise<void>;
        setSingleButtonColor(xy: number, color: Color): boolean;

        // Getters
        public readonly availablePorts: { input: number[], output: number[] };
        public readonly pressedButtons: number[][];

        // Setters
        // Note that flash doesn't have getter.
        public flash: boolean;

        // Properties which have both getter and setter
        public writeBuffer: number;
        public displayBuffer: number;

        setBuffers(args?: {write?: number, display?: number, copyToDisplay?: boolean, flash?: boolean}): void;
        multiplexing(num?: number, den?:  number): void;
        brightness(brightness: number): void;
        fromMap(map: string): ButtonXY[];
        fromPattern(pattern: string | string[]): ButtonXY[];
        private _button(xy: ButtonXY): Button;
        private _processMessage(deltaTime: number, message: MidiMessage): void;

        Colors: Colors;
        Buttons: Buttons;
    }
}
