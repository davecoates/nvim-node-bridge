/**
 * Generate range of numbers from start to stop with step size
 * @param {Number} start
 * @param {Number} stop
 * @param {Number} step
 * @return Array<Number>
 */
export function range(start:number, stop:number, step:number = 1) : Array<number> {
    let numbers = [];
    if (start < stop) {
        if (step <= 0) return numbers;
        for (let i=start;i < stop; i += step) {
            numbers.push(i);
        }
        return numbers;
    }
    if (step >= 0) {
        return numbers;
    }
    for (let i=start;i > stop;i += step) {
        numbers.push(i);
    }
    return numbers;
}

