export type HoldRepeatCallback = (key: string) => void;

export class HoldRepeatController {
  private holdTimer: ReturnType<typeof setTimeout> | undefined;
  private repeatTimer: ReturnType<typeof setInterval> | undefined;
  private isRepeating = false;
  private activeKey: string | null = null;
  private ignoreClickUntil = 0;

  constructor(
    private getDelay: () => number,
    private getInterval: () => number,
    private onFire: HoldRepeatCallback,
    private debugLog?: (...args: any[]) => void,
  ) {}

  onPointerDown(key: string, e: PointerEvent) {
    this.debugLog?.(
      `pointerDown key=${key} delay=${this.getDelay()} interval=${this.getInterval()}`,
    );
    try {
      (e as any).preventDefault();
    } catch {}
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    this.activeKey = key;
    this.isRepeating = false;
    clearTimeout(this.holdTimer);
    clearInterval(this.repeatTimer);
    this.holdTimer = setTimeout(() => {
      this.isRepeating = true;
      this.onFire(key);
      let count = 1;
      this.repeatTimer = setInterval(() => {
        count++;
        this.debugLog?.(`repeat #${count} key=${key}`);
        this.onFire(key);
      }, this.getInterval());
    }, this.getDelay());
  }

  onPointerUp(e: PointerEvent) {
    this.debugLog?.(`pointerUp active=${this.activeKey} repeating=${this.isRepeating}`);
    try {
      (e as any).preventDefault();
    } catch {}
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    clearTimeout(this.holdTimer);
    clearInterval(this.repeatTimer);
    const shouldFire = this.activeKey && !this.isRepeating;
    const key = this.activeKey;
    this.ignoreClickUntil = Date.now() + 600;
    this.activeKey = null;
    this.isRepeating = false;
    if (shouldFire && key) this.onFire(key);
  }

  onPointerCancel(_e: PointerEvent) {
    clearTimeout(this.holdTimer);
    clearInterval(this.repeatTimer);
    this.activeKey = null;
    this.isRepeating = false;
    this.ignoreClickUntil = Date.now() + 600;
  }

  onClick(key: string, e: Event): boolean {
    if (Date.now() < this.ignoreClickUntil) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch {}
      return false;
    }
    this.onFire(key);
    return true;
  }

  get active() {
    return this.activeKey;
  }
  get repeating() {
    return this.isRepeating;
  }

  destroy() {
    clearTimeout(this.holdTimer);
    clearInterval(this.repeatTimer);
  }
}
