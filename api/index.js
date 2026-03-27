import { createApp, createStore } from '../src/app.js'
import { createWebhookNotifier } from '../src/integrations/eventNotifier.js'

const store = globalThis.__supportCenterStore || (globalThis.__supportCenterStore = createStore())
const notifier = createWebhookNotifier({
  webhookUrl: process.env.SUPPORT_WEBHOOK_URL,
})

const app = createApp(store, { notifier })

export default app
