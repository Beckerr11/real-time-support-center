import { randomUUID } from 'node:crypto'

const VALID_STATUS = new Set(['new', 'open', 'waiting', 'resolved'])

export function createStore() {
  return {
    conversations: [],
  }
}

export function createConversation(store, { clientId, message }) {
  if (!clientId || !message) {
    throw new Error('clientId e message sao obrigatorios')
  }

  const conversation = {
    id: randomUUID(),
    clientId: String(clientId),
    status: 'new',
    createdAt: new Date().toISOString(),
    messages: [
      {
        id: randomUUID(),
        author: String(clientId),
        role: 'client',
        text: String(message),
        createdAt: new Date().toISOString(),
      },
    ],
  }

  store.conversations.push(conversation)
  return conversation
}

export function replyToConversation(store, conversationId, { operatorId, message }) {
  const conversation = store.conversations.find((item) => item.id === conversationId)
  if (!conversation) {
    throw new Error('conversa nao encontrada')
  }

  if (!operatorId || !message) {
    throw new Error('operatorId e message sao obrigatorios')
  }

  conversation.status = 'open'
  conversation.messages.push({
    id: randomUUID(),
    author: String(operatorId),
    role: 'operator',
    text: String(message),
    createdAt: new Date().toISOString(),
  })

  return conversation
}

export function updateConversationStatus(store, conversationId, status) {
  const conversation = store.conversations.find((item) => item.id === conversationId)
  if (!conversation) {
    throw new Error('conversa nao encontrada')
  }

  if (!VALID_STATUS.has(status)) {
    throw new Error('status invalido')
  }

  conversation.status = status
  return conversation
}

export function queueSnapshot(store) {
  return store.conversations
    .filter((item) => item.status === 'new' || item.status === 'waiting')
    .map((item) => ({ id: item.id, clientId: item.clientId, status: item.status, createdAt: item.createdAt }))
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json' })
  res.end(JSON.stringify(payload))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      if (!chunks.length) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('JSON invalido'))
      }
    })
    req.on('error', reject)
  })
}

export function createApp(store = createStore()) {
  return async function app(req, res) {
    const url = new URL(req.url || '/', 'http://localhost')

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { ok: true, service: 'real-time-support-center' })
        return
      }

      if (req.method === 'POST' && url.pathname === '/conversations') {
        const payload = await readJsonBody(req)
        const conversation = createConversation(store, payload)
        sendJson(res, 201, { conversation })
        return
      }

      if (req.method === 'GET' && url.pathname === '/conversations') {
        sendJson(res, 200, { conversations: store.conversations })
        return
      }

      if (req.method === 'GET' && url.pathname === '/queue') {
        sendJson(res, 200, { queue: queueSnapshot(store) })
        return
      }

      const replyMatch = url.pathname.match(/^\/conversations\/([^/]+)\/reply$/)
      if (req.method === 'POST' && replyMatch) {
        const payload = await readJsonBody(req)
        const updated = replyToConversation(store, replyMatch[1], payload)
        sendJson(res, 200, { conversation: updated })
        return
      }

      const statusMatch = url.pathname.match(/^\/conversations\/([^/]+)\/status$/)
      if (req.method === 'PATCH' && statusMatch) {
        const payload = await readJsonBody(req)
        const updated = updateConversationStatus(store, statusMatch[1], payload.status)
        sendJson(res, 200, { conversation: updated })
        return
      }

      sendJson(res, 404, { error: 'rota nao encontrada' })
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'erro inesperado' })
    }
  }
}