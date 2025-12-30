import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { session } from './lib/session.js'
import * as query from './db/query.js'
import { webSocket } from './lib/webSocket.js'

const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}
));

app.use(session);
const server = createServer(app);

let sockets = new Map();

app.post('/session', (req, res) => {
    if (req.session.user) {
        return res.json({ user: req.session.user });
    }
    return res.status(400).json({ message: 'not logged in' });
})

app.post('/login', express.json(), async (req, res) => {

    let name = req.body.name;
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
            res.status(400).json({ message: "username already exist" });
        }
    }
})

app.get('/friends', async (req, res) => {
    if (!req.session.user) return res.status(400);
    let user = req.session.user;

    let friends = await query.getAllUserFriends(user.id);

    for await (let friend of friends) {
        if (friend.id == 0) {
            friend.isOnline = true;
            friend.chatId = 0;
            continue;
        }
        let chatId = await query.getChatId(user.id, friend.id);
        friend.isOnline = sockets.has(friend.id);
        friend.chatId = chatId;
    }
    res.json({ friends });
})


app.get('/chats/:chatId', async (req, res) => {
    let user = req.session.user;

    if (!user) return res.status(400);

    let chatId = req.params.chatId;

    if (chatId == 0) {
        let messages = await query.getAllGlobalMessages();
        res.json({ messages });
        return;
    }
    let messages = await query.getChatMessages(chatId);
    res.json({ messages });
})



server.on('upgrade', (req, socket, head) => {
    session(req, {}, () => {
        if (!req.session.user) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        webSocket.handleUpgrade(req, socket, head, (ws) => {
            webSocket.emit('connection', req, ws);
        })

    })
})

webSocket.on('connection', async (req, ws) => {

    console.log(`🌐 A client Connected Current Users ${sockets.size}`);

    const user = req.session.user;

    sockets.set(user.id, ws);

    ws.on('message', async function handleIncomingMessage(data) {

        data = JSON.parse(data.toString());

        const { content, chatId, friendId } = data;

        if (chatId == 0) {
            let message = await query.insertGlobalMessage(content, user.id);
            sockets.forEach((socket) => {
                socket.send(JSON.stringify({ message, chatId: 0 }));
            })
            return;
        }

        let message = await query.insertNewMessage(chatId, content, user.id);

        ws.send(JSON.stringify({ message, chatId }));

        if (sockets.has(friendId)) {
            sockets.get(friendId).send(JSON.stringify({ message, chatId }));
        }
    })

    ws.on('close', () => {
        sockets.delete(user.id);
        console.log(`🔌 a Client disconnected Current Users ${sockets.size}`);

    })

})

const PORT = process.env.PORT || 8080;
server.listen(8080, '127.0.0.1', () => {
    console.log(`server is listening on PORT ${PORT}`);
})