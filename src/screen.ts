/* @flow */
import { range } from './util';

import { EventEmitter } from 'events';

export class Point {
    row:number;
    column:number;
    
    constructor(row, column) {
        this.row = row;
        this.column = column;
    }
}

interface CursorPosition {
    row: number;
    col: number;
};

interface ScreenSize {
    rows:number;
    columns:number;
}

    
export default class Screen {

    screenSize: ScreenSize;

    cursor: CursorPosition = {
        row: 0,
        col: 0,
    };

    top:number = 0;
    bot:number = 0;
    left:number = 0;
    right:number = 0;

    lineNumberColumns:number;

    emitter:EventEmitter;

    // rows x cols array, each element in nested array a character
    cells:Array<Array<string>> = [];

    constructor(screenSize:ScreenSize, lineNumberColumns:number) {
        this.emitter = new EventEmitter();
        this.lineNumberColumns = lineNumberColumns;
        this.screenSize = screenSize;
        this.top = 0;
        this.bot = this.screenSize.rows - 1;
        this.left = 0;
        this.right = this.screenSize.columns - 1;

        for (let i = 0; i < this.screenSize.rows; i++) {
            this.cells[i] = [];
            for (let j = 0; j < this.screenSize.columns; j++) {
                this.cells[i][j] = '';
            }
        }
    }

    cursor_goto(row:number, col:number) {
        this.cursor.row = row;
        this.cursor.col = col;
    }

    eol_clear() {
        for (let i = this.cursor.col; i < this.cells[this.cursor.row].length; i++) {
            this.cells[this.cursor.row][i] = '';
        }
        this.emitter.emit('eol_clear', {
            screenPosition: new Point(this.cursor.row, this.cursor.col),
            bufferColumn: this.cursor.col,
        });
    }



    put(text:string) {
        this.cells[this.cursor.row][this.cursor.col] = text;
        const col = this.cursor.col;
        this.emitter.emit('put', {
            screenPosition: new Point(this.cursor.row, this.cursor.col),
            bufferColumnRange: [col, col],
            text,
        });
        this.cursor.col++;
    }

    redrawFinish() {
        this.emitter.emit('finish');
    }

    /**
     * Shift scroll region
     * Ported from: https://github.com/neovim/python-gui/blob/master/neovim_gui/screen.py
     */
    scroll(count:number) {
        const { top, bot, left, right } = this;
        let start, stop, step;
        if (count > 0) {
            start = top;
            stop = bot - count + 1;
            step = 1;
        } else {
            start = bot;
            stop = top - count - 1;
            step = -1;
        }
        // shift the cells
        for (const i of range(start, stop, step)) {
            for (let j = left; j <= right; j++) {
                this.cells[i][j] = this.cells[i + count][j];
            }
        }
        // clear invalid cells
        for (const i of range(stop, stop + count, step)) {
            this.clear_region(i, i, left, right);
        }
    }

    set_scroll_region(top:number, bot:number, left:number, right:number) {
        this.top = top;
        this.bot = bot;
        this.left = left;
        this.right = right;
    }

    clear() {
        this.clear_region(this.top, this.bot, this.left, this.right)
    }

    clear_region(top:number, bot:number, left:number, right:number) {
        for (let i = top; i <= bot; i++) {
            for (let j = left; j <= right; j++) {
                this.cells[i][j] = '';
            }
        }
    }

    getCursorPosition() : Array<number> {
        return [this.cursor.row + this.getOffsetLine(), this.cursor.col - this.lineNumberColumns];
    }

    getOffsetLine() : number {
        return Number(this.cells[0].slice(0, this.lineNumberColumns).join('')) - 1;
    }

    /**
     * Get a row of the grid as text. Converts any gaps in the grid to spaces.
     * Neovim sends us text changes and the eol_clear and clear commands reset
     * text in areas. We track this as an empty string but visually it may need
     * to be shown as a space. We don't put each cell at a specific position in
     * Atom rather we replace a section of a line so we need to fill any gaps
     * represented by an empty string in the row with a space but only up until
     * the last non-empty character. If we just used a space character instead
     * we would end up with whitespace at the end of the line which would
     * visually look fine but would cause other problems (eg. linters that read
     * the buffer might complain about trailing spaces etc).
     */
    getRowAsText(rowNum:number, colStart:number, colEnd:number) : string {
        const row = this.cells[rowNum];

        let text = '';
        let noCharRun = 0;
        let i;
        for (i = colStart; i < colEnd; i++) {
            const c = row[i];
            if (c === '') {
                noCharRun++;
            } else {
                text += ' '.repeat(noCharRun) + c;
                noCharRun = 0;
            }
        }
        while (i < row.length) {
            const c = row[i];
            if (c !== '') {
                text += ' '.repeat(noCharRun);
                break;
            }
            i++;
        }
        return text;
    }

}
