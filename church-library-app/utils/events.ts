// utils/events.ts
import { EventEmitter } from "fbemitter";

const emitter = new EventEmitter();

export const events = {
  emit: (event: string, payload?: any) => emitter.emit(event, payload),
  listen: (event: string, cb: any) => emitter.addListener(event, cb),
};
