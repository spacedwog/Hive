declare module 'react-native-event-source' {
  interface EventSourceInitDict {
    headers?: { [key: string]: string };
    heartbeatTimeout?: number;
  }

  export default class EventSource {
    constructor(url: string, eventSourceInitDict?: EventSourceInitDict);
    addEventListener(type: string, listener: (event: { data: string }) => void): void;
    removeEventListener(type: string, listener: (event: { data: string }) => void): void;
    close(): void;
  }
}