import test from 'node:test'
import assert from 'node:assert/strict'
import { createStore, createConversation, replyToConversation, updateConversationStatus, queueSnapshot } from '../src/app.js'

test('support flow creates conversation, replies and updates queue', () => {
  const store = createStore()
  const conversation = createConversation(store, { clientId: 'client-a', message: 'Oi, preciso de ajuda' })

  assert.equal(queueSnapshot(store).length, 1)

  replyToConversation(store, conversation.id, { operatorId: 'op-1', message: 'Estou aqui para ajudar' })
  updateConversationStatus(store, conversation.id, 'resolved')

  assert.equal(queueSnapshot(store).length, 0)
  assert.equal(store.conversations[0].messages.length, 2)
  assert.equal(store.conversations[0].status, 'resolved')
})