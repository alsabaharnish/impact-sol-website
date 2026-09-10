import { createServer } from 'node:http';
import { createRequestHandler } from './app.mjs';
import { loadConfig } from './config.mjs';
import { createDeliveryWorker } from './delivery.mjs';
import { openStorage } from './storage.mjs';

const config = loadConfig();
const storage = openStorage(config.databasePath);
const deliveryWorker = createDeliveryWorker({ storage, config });
const handler = createRequestHandler({ config, storage, deliveryWorker });
const server = createServer((request, response) => void handler(request, response));

const cleanup = () => storage.cleanup();
cleanup();
const cleanupTimer = setInterval(cleanup, 24 * 60 * 60 * 1000);
cleanupTimer.unref?.();
deliveryWorker.start();

if (config.ipHashSecretIsEphemeral) {
  console.warn('INQUIRY_IP_HASH_SECRET is not configured; rate-limit hashes will reset when this process restarts.');
}
if (!deliveryWorker.configured) {
  console.warn('Email delivery is held until RESEND_API_KEY and INQUIRY_FROM_EMAIL are configured.');
}
if (!config.toEmail) {
  console.warn('Internal inquiry alerts are held until INQUIRY_TO_EMAIL is configured.');
}

server.listen(config.port, config.host, () => {
  console.info(`Impact Sol server listening on http://${config.host}:${config.port}`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Received ${signal}; closing the inquiry service.`);
  clearInterval(cleanupTimer);
  deliveryWorker.stop();
  server.close(() => {
    storage.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

