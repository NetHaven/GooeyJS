import ObservableBase from '../events/ObservableBase.js';
import TimerEvent from '../events/TimerEvent.js';

export default class Timer extends ObservableBase {
    constructor (timerDelay, timerRepeatCount) {
        super();

        this.currentCount = 0;
        this.delay = timerDelay;
        this.repeatCount = timerRepeatCount;
        this.running = false;
        this.interval = 0;

        // Register valid timer events
        this.addValidEvent(TimerEvent.TIMER);
        this.addValidEvent(TimerEvent.COMPLETE);

        // Bind callback to preserve this context
        this.callback = this.callback.bind(this);
    }
    
    callback() {
        this.fireEvent(TimerEvent.TIMER);
        this.currentCount++;
        if (this.currentCount === this.repeatCount) {
            this.fireEvent(TimerEvent.COMPLETE);
            this.stop();
        }
    }

    reset() {
        this.stop();
        this.currentCount = 0;
    }

    start() {
        if (!this.running) {
            this.interval = window.setInterval(this.callback, this.delay);
            this.running = true;
        }
    }

    stop() {
        window.clearInterval(this.interval);
        this.running = false;
    }
}