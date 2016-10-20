import xs from 'xstream';
import * as path from 'path';
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
    const addAutocmd = (type, eventName, isDelete = false) => {
        let windowIdFunc = isDelete ? 'neovimbed.getPreviousBufferWindowId()' : 'neovimbed.getCurrentWindowId()';
        nvim.command(`autocmd ${type} * call rpcnotify(0, "${eventName}", [${windowIdFunc}, bufnr(""), bufname(bufnr(""))], expand("%:p"))`)
        nvim.subscribe(eventName);
    }
    addAutocmd('BufRead', 'buf-read');
    addAutocmd('BufNewFile', 'buf-new-file');
    addAutocmd('BufDelete', 'buf-delete', true);
    addAutocmd('BufEnter', 'buf-enter');
    addAutocmd('BufWritePost', 'buf-write-post');
    nvim.command('autocmd BufAdd * call neovimbed.NotifyIfNewEmptyBuffer("buf-add-empty")')
    nvim.subscribe('buf-add-empty');
    nvim.on('notification', eventHandler);
}


export default class Bridge {

    nvim:Nvim;
    windowConfig:WindowConfigOptions;

    constructor(windowConfig:WindowConfigOptions, nvim:Nvim) {
        this.nvim = nvim;
        this.windowConfig = windowConfig;
        this.initialize();
    }

    async initialize() {
        const { nvim, windowConfig } = this;
        await nvim.uiAttach(windowConfig.columns, windowConfig.rows, true);
        await nvim.command(`source ${path.resolve(__dirname, '../src')}/vim-helpers.vim`);
        await nvim.command(`source ${path.resolve(__dirname, '../src')}/event-log.vim`);
        await nvim.command(`set statusline=%{neovimbed.getCurrentWindowId()}/%n/%{winnr()}/%{winwidth(winnr())}x%{winheight(winnr())}/%{virtcol('.')},%{line('.')}/%L/%{len(getline(line('$')))}/%{&modified}`)
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