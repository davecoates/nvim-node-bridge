import * as path from 'path';
import { Nvim } from 'neovim-client/promise';
import { EventEmitter } from 'events';
import Screen from './screen';
import WindowManager from './window-manager';

export interface WindowConfigOptions {
    columns:number;
    rows:number;
}

function configureNeovim(nvim:Nvim, lineNumberColumns:number) {
    const settings = [
        'se nu',
        'se norelativenumber',
        `se numberwidth=${lineNumberColumns}`,
        'se hidden',
        'se nomore',
        'se nowrap',
    ];
    return Promise.all(settings.map(setting => nvim.command(setting))); 
}

function setupNeovimEvents(nvim:Nvim, eventHandler) {
    const addBufAutoCmd = (type, eventName, isDelete = false) => {
        const windowIdFunc = isDelete ? 'neovimbed.getPreviousBufferWindowId()' : 'neovimbed.getCurrentWindowId()';
        nvim.command(`autocmd ${type} * call rpcnotify(0, "${eventName}", [${windowIdFunc}, bufnr(expand("<afile>")), bufname(bufnr(""))], expand("%:p"))`)
        nvim.subscribe(eventName);
    }
    addBufAutoCmd('BufRead', 'buf-read');
    addBufAutoCmd('BufNewFile', 'buf-new-file');
    addBufAutoCmd('BufDelete', 'buf-delete', true);
    addBufAutoCmd('BufEnter', 'buf-enter');
    addBufAutoCmd('BufWritePost', 'buf-write-post');
    nvim.command(`autocmd WinEnter * if !exists('w:created') | call rpcnotify(0, "win-created", [neovimbed.getCurrentWindowId(), bufnr("")], expand("%:p")) | endif`)
    nvim.command('autocmd BufAdd * call neovimbed.NotifyIfNewEmptyBuffer("buf-add-empty")')
    nvim.command('autocmd WinEnter * let w:created=1'); 
    nvim.subscribe('win-created');
    nvim.subscribe('buf-add-empty');
    nvim.on('notification', eventHandler);
}

const STATUS_LINE_INDICATOR = '__STL';
const statusLineParts = [
    ['statusLineIndicator', STATUS_LINE_INDICATOR],
    ['windowId', '%{neovimbed.getCurrentWindowId()}'],
    ['bufferNumber', '%n'],
    ['windowWidth', '%{winwidth(winnr())}'],
    ['windowHeight', '%{winheight(winnr())}'],
    ['screenColumn', "%{virtcol('.')}"],
    ['screenLine', "%{line('.')}"],
    ['bufferLineCount', '%L'],
    ['isModified', '%{&modified}'],
];

export default class Bridge {

    nvim:Nvim;
    windowConfig:WindowConfigOptions;
    emitter:EventEmitter;
    screen:Screen;
    windowManager:WindowManager;

    constructor(windowConfig:WindowConfigOptions, nvim:Nvim) {
        this.emitter = new EventEmitter();
        this.nvim = nvim;
        this.windowConfig = windowConfig;
        this.initialize();
    }

    async initialize() {
        const { nvim, windowConfig } = this;
        await nvim.uiAttach(windowConfig.columns, windowConfig.rows, true);
        await nvim.command(`source ${path.resolve(__dirname, '../src')}/vim-helpers.vim`);
        //await nvim.command(`source ${path.resolve(__dirname, '../src')}/event-log.vim`);
        const lineNumberColumns = 6;
        this.screen = new Screen(windowConfig, lineNumberColumns);
        await setupNeovimEvents(nvim, this.onNotification);
        await configureNeovim(nvim, lineNumberColumns);
        await nvim.command(`set statusline=${statusLineParts.map(p => p[1])}`);
        nvim.on('request', function(method, args, resp) {
            console.log(method, args, resp)
            // handle msgpack-rpc request
        });

        this.emitter.on('windowSyncStart', () => {
            // pause redraw
            console.log('windowSyncStart!!');
        });
        this.emitter.on('windowSyncFinish', () => {
            // unpause redraw
            console.log('windowSyncFinish!!');
        });

        this.windowManager = new WindowManager(nvim, this.screen, this.emitter);
    }

    getCellsAsText = () => {
       return this.screen.cells.map(line => line.map(c => c === '' ? ' ' : c).join('')).join('\n');
    };

    getBufferAsText = async () => {
        const buffer = await this.nvim.getCurrentBuffer();
        const lineCount = await buffer.lineCount();
        const lines = await buffer.getLineSlice(0, lineCount, true, true);
        return lines.join("\n");
    };

    onNotification = (method, args) => {
        switch (method) {
            case 'redraw':
            if (args.length === 0) break;
            for (const [message, ...updates] of args) {
                if (this.screen[message]) {
                    for (const update of updates) {
                        this.screen[message](...update);
                    }
                    if (message === 'put') {
                        const str = updates.map(update => update[0]).join('');
                        console.log('put ', str);
                    } else {
                        // console.log(message, ...updates);
                    }
                } else {
                    // console.log('unhandled', message, ...updates);
                }
            }
            this.screen.redrawFinish();
            break;
            default:
            this.emitter.emit(method, args);
            console.log(method, args);
            break;
        }
    }

}