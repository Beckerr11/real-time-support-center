import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createStore,
  createConversation,
  assignConversation,
  addMessage,
  updateConversationStatus,
  queueSnapshot,
} from '../src/app.js'

test('support flow handles assignment, reply and status changes', () => {
  const store = createStore()
  const conversation = createConversation(store, {
    clientId: 'client-a',
    message: 'Oi, preciso de ajuda',
    priority: 'high',
  })

  const assigned = assignConversation(store, conversation.id, 'op-1')
  assert.equal(assigned.assignedOperatorId, 'op-1')

  addMessage(store, conversation.id, { role: 'operator', author: 'op-1', message: 'Estou aqui para ajudar' })
  updateConversationStatus(store, conversation.id, 'resolved')

  assert.equal(store.conversations[0].messages.length, 2)
  assert.equal(store.conversations[0].status, 'resolved')
})

test('queue snapshot marks overdue conversations', () => {
  const store = createStore()
  const conversation = createConversation(store, {
    clientId: 'client-b',
    message: 'demora',
    priority: 'urgent',
  })

  updateConversationStatus(store, conversation.id, 'waiting')

  const farFuture = new Date(conversation.slaDueAt).getTime() + 1
  const queue = queueSnapshot(store, farFuture)

  assert.equal(queue.length, 1)
  assert.equal(queue[0].overdue, true)
})