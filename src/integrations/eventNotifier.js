export function createNoopNotifier() {
  return async function noopNotifier() {
    return { delivered: false, reason: 'disabled' }
  }
}

export function createWebhookNotifier(options = {}) {
  const webhookUrl = String(options.webhookUrl || '').trim()

  if (!webhookUrl) {
    return createNoopNotifier()
  }

  return async function webhookNotifier(event) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(event),
      })
      return { delivered: true }
    } catch {
      return { delivered: false, reason: 'network_error' }
    }
  }
}