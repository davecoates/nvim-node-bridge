import { attach } from 'promised-neovim-client';
import { spawn, ChildProcess } from 'child_process';
import Bridge, { WindowConfigOptions } from './bridge';
import * as net from 'net';

interface BridgeConfigOptions {
    path?: string;
    configFile?: string;
    useSocket?:boolean;
    socketPath?:string;
}

export default async function initializeBridge(windowConfig:WindowConfigOptions, options:BridgeConfigOptions = {}) {
    const {
        path = '/usr/local/bin/nvim',
        configFile = 'NONE',
        useSocket = false,
        socketPath = '/tmp/nvim',
    } = options;
    let nvim;
    if (useSocket) {
        const client = net.connect(socketPath);
        nvim = await attach(client, client);
    } else {
        const nvimProcess = spawn(path, ['-u', configFile, '--embed'], {});
        nvim = await attach(nvimProcess.stdin, nvimProcess.stdout);
    }
    return new Bridge(windowConfig, nvim);
}