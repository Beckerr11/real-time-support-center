import http from 'node:http'

const port = Number(process.env.PORT || 3000)

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'real-time-support-center' }))
    return
  }

  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ message: 'Scaffold inicial de real-time-support-center' }))
})

server.listen(port, () => {
  console.log('real-time-support-center running on port ' + port)
})