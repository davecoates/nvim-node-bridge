import { EventEmitter } from 'events';
import { Nvim } from 'neovim-client/promise';
import Screen, { Point } from './screen';
import { Observable } from 'rxjs/Rx';


async function fetchAndSyncWindows(nvim) {
    // Pause redraw stream so any processing of that is delayed until after
    // window sync is completed
    //await nvim.command('windo call setwinvar(winnr(), "number", winnr())');
    const windows = await nvim.getWindows();
    // Didn't seem to be anyway to get the window number
    // directly from the window provided by the neovim client.
    // Read window var to track this for each window. See vim-helpers.vim
    // for where this is originally set.
    const details = new Map();
    for (const win of windows) {
        const [row, column] = await win.getPosition();
        const position = new Point(row, column);
        const height = await win.getHeight();
        const width = await win.getWidth();
        const windowId = await win.getVar('nvim_window_name');
        const buffer = await win.getBuffer();
        const bufferNumber = await buffer.getNumber();
        const lineNumbersEnabled = await win.getOption('nu');
        details.set(windowId, ({ lineNumbersEnabled, bufferNumber, windowId, position, width, height }));
    }
    return details;
}


export default class WindowManager {

    screen: Screen;
    nvim: Nvim;

    constructor(nvim: Nvim, screen: Screen, vimEvents: EventEmitter) {
        this.screen = screen;
        this.nvim = nvim;

        // When win-enter is initially fired the position of the window is
        // always [0, 0] - introduce delay to give this time to resolve.
        const winCreated$ = Observable.fromEvent(vimEvents, 'win-created');
        // This gets fired multiple times for same thing for some reason -
        // compress to single latest event in last 50ms
        const bufEnter$ = Observable.fromEvent(vimEvents, 'buf-enter')
            .bufferTime(50).groupBy(event => event.bufferNumber).flatMap(group => group.last());
        bufEnter$.subscribe(async (details) => {
            console.log('last buf enter', details);
        });
        winCreated$.debounce(() => Observable.timer(500)).subscribe(async () => {
            vimEvents.emit('windowSyncStart');
            const windows = await fetchAndSyncWindows(this.nvim);
            vimEvents.emit('windowSyncFinish', windows);
        });
        // ...but pause the redraw stream immediately as we need to delay that
        // until windows have been sync'd
        winCreated$.subscribe(() => {
            console.log('WIN-CREATED');
            //this.redrawFinishStream.pause();
        });
        Observable.fromEvent(vimEvents, 'buf-enter').subscribe(details => {
            console.log('BUF-ENTER', details);
            const { windowNumber, bufferNumber } = details;
        });
 
    }

}