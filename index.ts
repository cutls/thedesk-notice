import { connection, server as WebSocketServer } from 'websocket'
import http from 'http'
import generator from 'megalodon'
import dotenv from 'dotenv'
dotenv.config()
const BASE_URL = process.env.BASE_URL
const access_token = process.env.ACESS_TOKEN

const server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url)
    response.writeHead(404)
    response.end()
})
server.listen(8005, function () {
    console.log((new Date()) + ' Server is listening on port 8080')
})
const wss = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
})
//Websocket接続を保存しておく
let connections: connection[] = []
let ct = 0
//接続時
wss.on('request', function (req) {
    const query = require('url').parse(req.httpRequest.url).query
    const ws = req.accept()
    connections.push(ws)
    if (query == 'user') ct++
    let send: string | number = '?'
    if (ct > 30) send = ct
    broadcast(JSON.stringify({ text: send, type: 'counter' }))
    //切断時
    ws.on('close', function () {
        if (query == 'user') ct--
        connections = connections.filter((conn, i) => conn !== ws)
        broadcast(JSON.stringify({ text: ct, type: 'counter' }))
    });
    //メッセージ送信時
    ws.on('message', function (message) {
        if (message.type !== 'utf8') return
        const mes = JSON.parse(message.utf8Data)
        if (mes.password == process.env.CODE) {
            console.log('received: %s', mes.text)
            broadcast(JSON.stringify({ text: mes.text, type: mes.type, id: mes.id, domain: mes.dom, toot: mes.toot, ver: mes.ver, languages: mes.lang }))
        } else {
            ws.send(message)
        }
    })
})
//ブロードキャストを行う
function broadcast(message: string) {
    connections.forEach(function (con, i) {
        con.send(message)
    })
}
const tooter = async () => {
    if (!BASE_URL || !access_token) return
    const toot = `Current online user: ${ct}`
    const client = generator('mastodon', BASE_URL, access_token)
    client.postStatus(toot)
}
setInterval(() => {tooter()}, 1000 * 60 * 60)
setTimeout(() => {tooter()}, 1000 * 30)