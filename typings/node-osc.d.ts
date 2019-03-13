declare module 'node-osc' {
    class MessageArgument {
        type: string;
        value: any;
        constructor(type: string, value: any);
    }

    export class Messsage {
        oscType: 'message';
        address: string;
        args: MessageArgument[];

        constructor(address: string);
        append(arg: object | number | string): any;
    }

    export class Client {
        host: string;
        port: number;
        private _sock: any;
        constructor(host: string, port: number);
        send(...args: any[]): void;
        kill(): void;
    }

    export class Server {

    }
}
