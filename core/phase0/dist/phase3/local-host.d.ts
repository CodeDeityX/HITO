import { type IncomingMessage, type ServerResponse } from "node:http";
export interface LocalHostOptions {
    projectRoot: string;
    uiRoot?: string;
    port?: number;
    host?: "127.0.0.1";
}
export declare function createPhase3LocalHost(options: LocalHostOptions): {
    host: "127.0.0.1";
    port: number;
    server: import("http").Server<typeof IncomingMessage, typeof ServerResponse>;
};
