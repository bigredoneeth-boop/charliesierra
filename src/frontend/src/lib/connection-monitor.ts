/**
 * ConnectionMonitor — tracks network state with circuit breaker + exponential backoff.
 * Singleton export for app-wide use.
 */

export type ConnectionEvent =
  | "online"
  | "offline"
  | "reconnecting"
  | "paused"
  | "failed";
export type ConnectionState = "online" | "offline" | "reconnecting" | "paused";

type Listener = () => void;

const BACKOFF_STEPS_MS = [0, 2000, 4000, 8000, 16000, 32000, 60000];
const CIRCUIT_BREAKER_THRESHOLD = 5;
const PAUSED_DURATION_MS = 30_000;

class ConnectionMonitor {
  private state: ConnectionState = navigator.onLine ? "online" : "offline";
  private listeners: Map<ConnectionEvent, Set<Listener>> = new Map();
  private consecutiveFailures = 0;
  private backoffStep = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private lastConnectedAt: number | null = navigator.onLine ? Date.now() : null;

  constructor() {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  private handleOnline = () => {
    this.consecutiveFailures = 0;
    this.backoffStep = 0;
    this.clearTimers();
    this.setState("online");
    this.lastConnectedAt = Date.now();
    this.emit("online");
  };

  private handleOffline = () => {
    this.clearTimers();
    this.setState("offline");
    this.emit("offline");
    this.scheduleReconnect();
  };

  private setState(next: ConnectionState) {
    this.state = next;
  }

  private emit(event: ConnectionEvent) {
    const set = this.listeners.get(event);
    if (set) for (const fn of set) fn();
  }

  private clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.state === "paused") return;
    const delay =
      BACKOFF_STEPS_MS[Math.min(this.backoffStep, BACKOFF_STEPS_MS.length - 1)];
    this.setState("reconnecting");
    this.emit("reconnecting");
    this.reconnectTimer = setTimeout(() => this.attemptReconnect(), delay);
  }

  private attemptReconnect() {
    if (navigator.onLine) {
      this.handleOnline();
      return;
    }
    // Failed attempt
    this.consecutiveFailures++;
    this.backoffStep = Math.min(
      this.backoffStep + 1,
      BACKOFF_STEPS_MS.length - 1,
    );
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.setState("paused");
      this.emit("paused");
      this.pauseTimer = setTimeout(() => {
        this.consecutiveFailures = 0;
        this.backoffStep = 0;
        this.scheduleReconnect();
      }, PAUSED_DURATION_MS);
      return;
    }
    this.scheduleReconnect();
  }

  on(event: ConnectionEvent, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: ConnectionEvent, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
  }

  reconnect() {
    // Manual reconnect — reset circuit breaker
    this.consecutiveFailures = 0;
    this.backoffStep = 0;
    this.clearTimers();
    if (this.state === "paused" || this.state === "offline") {
      this.scheduleReconnect();
    }
  }

  get currentState(): ConnectionState {
    return this.state;
  }
  get failures(): number {
    return this.consecutiveFailures;
  }
  get lastConnected(): number | null {
    return this.lastConnectedAt;
  }
  get backoffStepIndex(): number {
    return this.backoffStep;
  }
}

export const connectionMonitor = new ConnectionMonitor();
