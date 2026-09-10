const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function deliveryReady(config) {
  return Boolean(config.resendApiKey && config.fromEmail);
}

function recipientFor(job, config) {
  return job.kind === 'internal' ? config.toEmail : job.recipient;
}

export function createDeliveryWorker({ storage, config, fetchImpl = globalThis.fetch, logger = console }) {
  let running = false;
  let timer = null;

  async function deliver(job) {
    const recipient = recipientFor(job, config);
    if (!recipient) {
      storage.releaseJob(job.id);
      return { state: 'held' };
    }

    try {
      const response = await fetchImpl(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `impact-sol-inquiry-${job.id}`,
        },
        body: JSON.stringify({
          from: config.fromEmail,
          to: [recipient],
          subject: job.subject,
          text: job.text_body,
          html: job.html_body,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        storage.failJob(job, `provider_http_${response.status}`, {
          maxAttempts: config.maxDeliveryAttempts,
        });
        logger.warn?.('Inquiry email delivery deferred.', {
          outboxId: job.id,
          kind: job.kind,
          status: response.status,
        });
        return { state: 'deferred', status: response.status };
      }

      let providerId = null;
      try {
        const result = await response.json();
        providerId = typeof result?.id === 'string' ? result.id.slice(0, 160) : null;
      } catch {
        // A successful provider response does not require a JSON body.
      }
      storage.completeJob(job.id, providerId);
      return { state: 'delivered' };
    } catch (error) {
      const errorCode = error?.name === 'TimeoutError' ? 'provider_timeout' : 'provider_network_error';
      storage.failJob(job, errorCode, { maxAttempts: config.maxDeliveryAttempts });
      logger.warn?.('Inquiry email delivery deferred.', {
        outboxId: job.id,
        kind: job.kind,
        error: errorCode,
      });
      return { state: 'deferred' };
    }
  }

  async function runOnce() {
    if (running || !deliveryReady(config)) return { processed: 0 };
    running = true;
    let processed = 0;
    try {
      const jobs = storage.claimDueJobs({ maxAttempts: config.maxDeliveryAttempts, limit: 10 });
      for (const job of jobs) {
        await deliver(job);
        processed += 1;
      }
      return { processed };
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer) return;
    timer = setInterval(() => void runOnce(), config.deliveryIntervalMs);
    timer.unref?.();
    queueMicrotask(() => void runOnce());
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return Object.freeze({
    configured: deliveryReady(config),
    runOnce,
    start,
    stop,
  });
}

