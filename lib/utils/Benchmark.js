class  Benchmark {
    #initTime;
    start() {
        return this.#initTime = process.hrtime.bigint();
    }
    finish() {
        const diff = process.hrtime.bigint() - this.#initTime;
        const seconds = Number(diff) / 1e9;
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toFixed(2).padStart(5, '0');
        const info = `${h}:${m}:${s}`;
        const datetime = this.#datetime();
        return { info, seconds, h, m, s, datetime };
    }
    #datetime() {
        const d = new Date();
        return [
            [d.getDate(), d.getMonth() + 1, d.getFullYear()]
                .map(n => n.toString().padStart(2, '0')).join('.'),
            [d.getHours(), d.getMinutes(), d.getSeconds()]
                .map(n => n.toString().padStart(2, '0')).join(':')
        ].join(' ');
    }
}

export const benchmark = new Benchmark();