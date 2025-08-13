import { RealtimeEventHandler } from './event_handler.js';
import { RealtimeUtils } from './utils.js';

export class RealtimeAPI extends RealtimeEventHandler {
  /**
   * Create a new RealtimeAPI instance
   * @param {{apiKey: string, debug?: boolean}} settings
   * @returns {RealtimeAPI}
   */
  constructor({ debug } = {}) {
    super();
    // this.resourceName = 'ai-plutoplan880402ai046227898129';
    // this.deploymentName = 'ojuss-realtime';

    // this.resourceName = 'ai-mayankmzp115468ai745029845784';
    // this.deploymentName = 'ojuss';

    // this.resourceName = 'ai-pyshe979141ai016442690868'
    // this.deploymentName = 'gpt-4o-realtime-preview';
    // this.url = `wss://${this.resourceName}.openai.azure.com/openai/realtime`;

    this.resourceName = 'agawal-resource';
    // this.deploymentName = 'ojuss-ai';
    this.deploymentName = 'gpt-4o-mini-realtime-preview'; //mini

    this.url = `wss://${this.resourceName}.openai.azure.com/openai/realtime`;
    // this.apiKey = apiKey || null;
    this.debug = !!debug;
    this.ws = null;
  }

  /**
   * Tells us whether or not the WebSocket is connected
   * @returns {boolean}
   */
  isConnected() {
    return !!this.ws;
  }

  /**
   * Writes WebSocket logs to console
   * @param  {...any} args
   * @returns {true}
   */
  log(...args) {
    const date = new Date().toISOString();
    const logs = [`[Websocket/${date}]`].concat(args).map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg, null, 2);
      } else {
        return arg;
      }
    });
    if (this.debug) {
      console.log(...logs);
    }
    return true;
  }

  /**
   * Connects to Azure OpenAI Realtime API Websocket Server
   * @returns {Promise<true>}
   */
  async connect() {
    if (this.isConnected()) {
      throw new Error('Already connected');
    }

    // const fullUrl = `${this.url}?api-version=2024-10-01-preview&deployment=${this.deploymentName}&api-key=3wDLJ8W61Sz0fkspXX478MRjq1UvCYNlErCEVj3jS09KrSi0c9ZdJQQJ99BCACHYHv6XJ3w3AAAAACOGsxlB`;
    // const fullUrl = `${this.url}?api-version=2024-10-01-preview&deployment=${this.deploymentName}&api-key=Cwfj5nih4rUog5tSsKagj7Dsl4HkEMq3X3UzXriCsu5srJ1cZarLJQQJ99BAACHYHv6XJ3w3AAAAACOG8UXh`;
    // const fullUrl = `${this.url}?api-version=2024-10-01-preview&deployment=${this.deploymentName}&api-key=8tus4Ulzdug9exGWTc693i21SIk7yqDRO7AWR8GJLqD9y1USWVNFJQQJ99BDACHYHv6XJ3w3AAAAACOG0vGi`;
    const fullUrl = `${this.url}?api-version=2024-10-01-preview&deployment=${this.deploymentName}&api-key=3QLKDZPDjoPQfXTBg8ScfYzm3dLdpGvO6E8agnnr8ORNqSCAKAmzJQQJ99BHACHYHv6XJ3w3AAAAACOGSaRH`;

    if (globalThis.document) {
      /**
       * Web browser
       */
      const WebSocket = globalThis.WebSocket;
      const ws = new WebSocket(fullUrl);

      ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        this.receive(message.type, message);
      });

      return new Promise((resolve, reject) => {
        const connectionErrorHandler = (error) => {
          this.disconnect(ws);
          reject(
            new Error(`Could not connect to "${fullUrl}": ${error.message}`),
          );
        };
        ws.addEventListener('error', connectionErrorHandler);
        ws.addEventListener('open', () => {
          this.log(`Connected to "${fullUrl}"`);
          ws.removeEventListener('error', connectionErrorHandler);
          ws.addEventListener('error', (error) => {
            this.disconnect(ws);
            this.log(`Error, disconnected from "${fullUrl}": ${error.message}`);
            this.dispatch('close', { error: true });
          });
          ws.addEventListener('close', () => {
            this.disconnect(ws);
            this.log(`Disconnected from "${fullUrl}"`);
            this.dispatch('close', { error: false });
          });
          this.ws = ws;
          resolve(true);
        });
      });
    } else {
      /**
       * Node.js
       */
      const moduleName = 'ws';
      const wsModule = await import(/* webpackIgnore: true */ moduleName);
      const WebSocket = wsModule.default;
      const ws = new WebSocket(fullUrl);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.receive(message.type, message);
      });

      return new Promise((resolve, reject) => {
        const connectionErrorHandler = (error) => {
          this.disconnect(ws);
          reject(
            new Error(`Could not connect to "${fullUrl}": ${error.message}`),
          );
        };
        ws.on('error', connectionErrorHandler);
        ws.on('open', () => {
          this.log(`Connected to "${fullUrl}"`);
          ws.removeListener('error', connectionErrorHandler);
          ws.on('error', (error) => {
            this.disconnect(ws);
            this.log(`Error, disconnected from "${fullUrl}": ${error.message}`);
            this.dispatch('close', { error: true });
          });
          ws.on('close', () => {
            this.disconnect(ws);
            this.log(`Disconnected from "${fullUrl}"`);
            this.dispatch('close', { error: false });
          });
          this.ws = ws;
          resolve(true);
        });
      });
    }
  }

  /**
   * Disconnects from Azure OpenAI Realtime API server
   * @param {WebSocket} [ws]
   * @returns {true}
   */
  disconnect(ws) {
    if (!ws || this.ws === ws) {
      this.ws && this.ws.close();
      this.ws = null;
      return true;
    }
  }

  /**
   * Receives an event from WebSocket and dispatches as "server.{eventName}" and "server.*" events
   * @param {string} eventName
   * @param {{[key: string]: any}} event
   * @returns {true}
   */
  receive(eventName, event) {
    this.log(`received:`, eventName, event);
    this.dispatch(`server.${eventName}`, event);
    this.dispatch('server.*', event);
    return true;
  }

  /**
   * Sends an event to WebSocket and dispatches as "client.{eventName}" and "client.*" events
   * @param {string} eventName
   * @param {{[key: string]: any}} data
   * @returns {true}
   */
  send(eventName, data) {
    if (!this.isConnected()) {
      throw new Error('RealtimeAPI is not connected');
    }
    data = data || {};
    if (typeof data !== 'object') {
      throw new Error('data must be an object');
    }
    const event = {
      event_id: RealtimeUtils.generateId('evt_'),
      type: eventName,
      ...data,
    };
    this.dispatch(`client.${eventName}`, event);
    this.dispatch('client.*', event);
    this.log(`sent:`, eventName, event);
    this.ws.send(JSON.stringify(event));
    return true;
  }
}
