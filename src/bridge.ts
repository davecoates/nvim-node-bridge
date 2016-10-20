import xs from 'xstream';
import { Nvim } from 'promised-neovim-client';

export interface WindowConfigOptions {
    columns:number;
    rows:number;
}

function configureNeovim(nvim:Nvim) {
    const settings = [
        'se nonu',
        'se norelativenumber',
        'se hidden',
        'se nomore',
        'se nowrap',
    ];
    return Promise.all(settings.map(setting => nvim.command(setting))); 
}

function setupNeovimEvents(nvim:Nvim, eventHandler) {
    const addAutocmd = (type, eventName) => {
        nvim.command(`autocmd ${type} * call rpcnotify(0, "${eventName}", [bufwinnr(""), bufnr(""), bufname(bufnr(""))], expand("%:p"))`)
        nvim.subscribe(eventName);
    }
    addAutocmd('BufRead', 'buf-read');
    addAutocmd('BufNewFile', 'buf-new-file');
    addAutocmd('BufDelete', 'buf-delete');
    addAutocmd('BufEnter', 'buf-enter');
    addAutocmd('BufWritePost', 'buf-write-post');
    nvim.on('notification', eventHandler);
    //await this.client.command('autocmd BufAdd * call neovimbed.NotifyIfNewEmptyBuffer("buf-add-empty")')
    //await this.client.subscribe('buf-add-empty');
}


export default class Bridge {

    nvim:Nvim;
    windowConfig:WindowConfigOptions;

    constructor(windowConfig:WindowConfigOptions, nvim:Nvim) {
        console.log('hello?');
        this.nvim = nvim;
        this.windowConfig = windowConfig;
        this.initialize();
    }

    async initialize() {
        const { nvim, windowConfig } = this;
        await nvim.uiAttach(windowConfig.columns, windowConfig.rows, true);
        await configureNeovim(nvim);
        await setupNeovimEvents(nvim, this.onNotification);
    }

    onNotification(method, args) {
        switch (method) {
            case 'redraw':
            break;
            default:
            console.log(method, args);
            break;
        }
    }

}