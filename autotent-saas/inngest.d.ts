declare module 'inngest/next' {
    import { ServeHandler } from 'inngest';
    export const serve: ServeHandler;
}

declare module 'inngest' {
    export class Inngest {
        constructor(config: any);
        createFunction(config: any, trigger: any, handler: any): any;
        send(event: any): Promise<any>;
    }
    export interface ServeHandler {
        (options: any): any;
    }
}
