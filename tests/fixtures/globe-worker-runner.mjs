import {parentPort, workerData} from 'node:worker_threads';

// Execute the actual module worker, without a browser or GPU. This also accepts
// its production bundle URL to exercise Vite's emitted dynamic imports.
globalThis.self = globalThis;
globalThis.postMessage = (message, {transfer} = {}) => parentPort.postMessage(message, transfer);
await import(workerData.url);
parentPort.on('message', data => globalThis.onmessage({data}));
parentPort.postMessage({ready: true});
