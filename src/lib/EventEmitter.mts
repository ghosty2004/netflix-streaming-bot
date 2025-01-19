export class EventEmitter<Events extends Record<string, any>> {
  private readonly eventSubscribers = new Map<
    keyof Events,
    Array<(...args: any[]) => void>
  >();

  subscribeToEvent<T extends keyof Events>(
    event: T,
    cb: (...args: Events[T]) => void
  ) {
    this.eventSubscribers.set(event, [
      cb,
      ...(this.eventSubscribers.get(event) ?? []),
    ]);
  }

  emitEventToSubcribers<T extends keyof Events>(event: T, ...args: Events[T]) {
    const cbs = this.eventSubscribers.get(event);
    if (!cbs) return;
    for (const cb of cbs) {
      cb(args);
    }
  }
}
