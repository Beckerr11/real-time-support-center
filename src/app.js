import { randomUUID } from 'node:crypto'

const VALID_STATUS = new Set(['new', 'open', 'waiting', 'resolved'])
const VALID_ROLE = new Set(['client', 'operator'])

const SLA_MINUTES_BY_PRIORITY = {
  urgent: 30,
  high: 120,
  normal: 480,
  low: 1440,
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function computeSlaDueAt(createdAtIso, priority = 'normal') {
  const minutes = SLA_MINUTES_BY_PRIORITY[priority] || SLA_MINUTES_BY_PRIORITY.normal
  return addMinutes(new Date(createdAtIso), minutes).toISOString()
}

export function createStore() {
  return {
    conversations: [],
  }
}

export function createRealtimeHub() {
  const clients = new Set()

  function subscribe(res) {
    clients.add(res)
  }

  function unsubscribe(res) {
    clients.delete(res)
  }

  function publish(type, payload) {
    const eventData = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`
    for (const client of clients) {
      client.write(eventData)
    }
  }

  return { subscribe, unsubscribe, publish }
}

export function createConversation(store, { clientId, message, priority = 'normal' }) {
  if (!clientId || !message) {
    throw new Error('clientId e message sao obrigatorios')
  }

  const createdAt = new Date().toISOString()
  const conversation = {
    id: randomUUID(),
    clientId: String(clientId),
    priority,
    status: 'new',
    assignedOperatorId: null,
    createdAt,
    slaDueAt: computeSlaDueAt(createdAt, priority),
    messages: [
      {
        id: randomUUID(),
        author: String(clientId),
        role: 'client',
        text: String(message),
        createdAt,
      },
    ],
  }

  store.conversations.push(conversation)
  return conversation
}

export function assignConversation(store, conversationId, operatorId) {
  const conversation = store.conversations.find((item) => item.id === conversationId)
  if (!conversation) {
    throw new Error('conversa nao encontrada')
  }
  if (!operatorId) {
    throw new Error('operatorId e obrigatorio')
  }

  conversation.assignedOperatorId = String(operatorId)
  if (conversation.status === 'new') {
    conversation.status = 'open'
  }

  return conversation
}

export function addMessage(store, conversationId, { role, author, message }) {
  const conversation = store.conversations.find((item) => item.id === conversationId)
  if (!conversation) {
    throw new Error('conversa nao encontrada')
  }
  if (!VALID_ROLE.has(role)) {
    throw new Error('role invalido')
  }
  if (!author || !message) {
    throw new Error('author e message sao obrigatorios')
  }

  if (role === 'operator') {
    conversation.status = 'open'
  }

  if (role === 'client' && conversation.status === 'resolved') {
    conversation.status = 'waiting'
  }

  conversation.messages.push({
    id: randomUUID(),
    author: String(author),
    role,
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

export function listConversations(store, filters = {}) {
  return store.conversations.filter((item) => {
    if (filters.status && item.status !== filters.status) {
      return false
    }
    if (filters.operatorId && item.assignedOperatorId !== filters.operatorId) {
      return false
    }
    return true
  })
}

export function queueSnapshot(store, now = Date.now()) {
  return store.conversations
    .filter((item) => item.status === 'new' || item.status === 'waiting')
    .map((item) => ({
      id: item.id,
      clientId: item.clientId,
      status: item.status,
      priority: item.priority,
      assignedOperatorId: item.assignedOperatorId,
      createdAt: item.createdAt,
      slaDueAt: item.slaDueAt,
      overdue: new Date(item.slaDueAt).getTime() < now,
    }))
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

export function createApp(store = createStore(), hub = createRealtimeHub()) {
  return async function app(req, res) {
    const url = new URL(req.url || '/', 'http://localhost')

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { ok: true, service: 'real-time-support-center' })
        return
      }

      if (req.method === 'GET' && url.pathname === '/events') {
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        })
        res.write('event: connected\ndata: {"ok":true}\n\n')
        hub.subscribe(res)
        req.on('close', () => hub.unsubscribe(res))
        return
      }

      if (req.method === 'POST' && url.pathname === '/conversations') {
        const payload = await readJsonBody(req)
        const conversation = createConversation(store, payload)
        hub.publish('conversation.created', conversation)
        sendJson(res, 201, { conversation })
        return
      }

      if (req.method === 'GET' && url.pathname === '/conversations') {
        const conversations = listConversations(store, {
          status: url.searchParams.get('status') || '',
          operatorId: url.searchParams.get('operatorId') || '',
        })
        sendJson(res, 200, { conversations })
        return
      }

      if (req.method === 'GET' && url.pathname === '/queue') {
        sendJson(res, 200, { queue: queueSnapshot(store) })
        return
      }

      const assignMatch = url.pathname.match(/^\/conversations\/([^/]+)\/assign$/)
      if (req.method === 'PATCH' && assignMatch) {
        const payload = await readJsonBody(req)
        const updated = assignConversation(store, assignMatch[1], payload.operatorId)
        hub.publish('conversation.assigned', updated)
        sendJson(res, 200, { conversation: updated })
        return
      }

      const messageMatch = url.pathname.match(/^\/conversations\/([^/]+)\/messages$/)
      if (req.method === 'POST' && messageMatch) {
        const payload = await readJsonBody(req)
        const updated = addMessage(store, messageMatch[1], payload)
        hub.publish('conversation.message', updated)
        sendJson(res, 201, { conversation: updated })
        return
      }

      const statusMatch = url.pathname.match(/^\/conversations\/([^/]+)\/status$/)
      if (req.method === 'PATCH' && statusMatch) {
        const payload = await readJsonBody(req)
        const updated = updateConversationStatus(store, statusMatch[1], payload.status)
        hub.publish('conversation.status', updated)
        sendJson(res, 200, { conversation: updated })
        return
      }

      sendJson(res, 404, { error: 'rota nao encontrada' })
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'erro inesperado' })
    }
  }
}