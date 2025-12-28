import db from './lib/client.js'
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import expressSession from 'express-session'
import cors from 'cors'
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import prisma from './lib/client.js'
import * as query from './db/query.js'

const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}
));

const server = createServer(app);

let session = expressSession({
    saveUninitialized: false,
    resave: true,
    secret: 'secret',
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
    },
    store: new PrismaSessionStore(
        prisma,
        {
            checkPeriod: 2 * 60 * 1000,  //ms
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        }
    )
})

app.use(session);

app.post('/login', express.json(), (req, res) => {
    req.session.user = { name: 'hany', email: 'hany@example.com', id: 7, image: 'https://i.pravatar.cc/150?u=hany' }
    res.json({ message: 'ok' });
})

app.get('/friends', async (req, res) => {

    let user = req.session.user;
    let friends = await query.getAllUserFriends(user.id);
    res.json({ friends })
})


app.get('/global', async (req, res) => {
    let user = req.session.user;
    let global = await query.getAllGlobalMessages();
    res.json({ global });
})


app.get('/chats/:friendId', async (req, res) => {
    let user = req.session.user;
    let friendId = req.params.friendId;

    let chatId = await query.getChatId(user.id, friendId);
    let messages = await query.getChatMessages(chatId);

    res.json({ messages });
})


const webSocket = new WebSocketServer({
    noServer: true,
    clientTracking: false,
})

server.on('upgrade', (req, socket, head) => {
    session(req, {}, () => {
        if (!req.session.user) {
            console.log(req.session);
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        webSocket.handleUpgrade(req, socket, head, (ws) => {
            webSocket.emit('connection', ws, req);
        })

    })
})

webSocket.on('connection', async (ws, req) => {
    console.log('🌐 A client Connected');
    let user = req.session.user;


    ws.on('message', async function handleIncomingMessage(data) {
        data = JSON.parse(data.toString());
        const { content, receiver } = data;

        let chatId = await query.getChatId(user.id, receiver);

        await query.insertNewMessage(chatId, content, user.id);
    })





})

const PORT = process.env.PORT || 8080;
server.listen(8080, '127.0.0.1', () => {
    console.log(`server is listening on PORT ${PORT}`);

})







