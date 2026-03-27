import http from 'node:http'
import { createApp, createStore } from './app.js'
import { createWebhookNotifier } from './integrations/eventNotifier.js'

const port = Number(process.env.PORT || 3000)
const notifier = createWebhookNotifier({
  webhookUrl: process.env.SUPPORT_WEBHOOK_URL,
})
const app = createApp(createStore(), { notifier })

http.createServer(app).listen(port, () => {
  console.log(`real-time-support-center running on port ${port}`)
})
