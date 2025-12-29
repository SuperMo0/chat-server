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

app.post('/login', express.json(), async (req, res) => {

    if (req.session.user) {
        res.json({ user: req.session.user });
        return;
    }
    else if (req.body.password == null) return res.status(400).json({ message: "no session" });
    let name = req.body.email;
    let password = req.body.password;

    let user = await query.getUser(name, password);

    if (user) {
        req.session.user = user
        res.json({ user });
    }
    else {
        try {
            let user = await query.insertNewUser(name, password);
            req.session.user = user
            res.json({ user });
        } catch (error) {
            res.status(400).json({ message: "already exist " });
        }
    }
})

app.get('/friends', async (req, res) => {

    let user = req.session.user;
    let friends = await query.getAllUserFriends(user.id);
    friends.forEach((f) => { f.isOnline = true });
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

    if (friendId == 0) {
        let messages = await query.getAllGlobalMessages();

        res.json({ messages });
        return;
    }
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

let sockets = new Map();

webSocket.on('connection', async (ws, req) => {
    console.log('🌐 A client Connected');
    let user = req.session.user;
    sockets.set(user.id, ws);

    ws.on('message', async function handleIncomingMessage(data) {
        data = JSON.parse(data.toString());
        const { content, receiver } = data;

        if (receiver == 0) {
            let message = await query.insertGlobalMessage(content, user.id);
            console.log(message);

            sockets.forEach((v, k) => {
                v.send(JSON.stringify({ message, receiver: receiver }));
            })
            return;
        }

        let chatId = await query.getChatId(user.id, receiver);
        let message = await query.insertNewMessage(chatId, content, user.id);
        ws.send(JSON.stringify({ message, receiver: receiver }));
        if (sockets.has(receiver)) {
            sockets.get(receiver).send(JSON.stringify({ message, receiver: receiver }));
        }
    })

    ws.on('close', () => {
        sockets.delete(user.id);
        console.log('🔌 a Client disconnected');

    })


})

const PORT = process.env.PORT || 8080;
server.listen(8080, '127.0.0.1', () => {
    console.log(`server is listening on PORT ${PORT}`);

})







