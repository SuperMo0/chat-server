import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { session } from './lib/session.js'
import * as query from './db/query.js'
import { webSocket } from './lib/webSocket.js'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import 'dotenv/config.js'
cloudinary.config({
    cloud_name: 'dclszdyzb',
    api_key: '193577243842688',
    api_secret: process.env.V2_SECRET,
});

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

app.post('/signup', express.json(), async (req, res) => {

    let email = req.body.email;
    let password = req.body.password;
    let name = req.body.name;

    let user = await query.insertNewUser(email, name, password);

    if (user) {
        req.session.user = user
        res.json({ user });
    }
    else {
        res.status(401).json({ message: "Email already exist" });
    }

})

app.post('/login', express.json(), async (req, res) => {

    let email = req.body.email;
    let password = req.body.password;

    console.log(password);


    let user = await query.getUser(email, password);

    if (user) {
        req.session.user = user
        res.json({ user });
    }
    else {
        res.status(401).json({ message: "Wrong credentials" });
    }

})

let upload = multer();
app.put('/profile', upload.single('image'), (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'invalid data' });
    let user = req.session.user;
    let file = req.file;
    cloudinary.uploader.upload_stream({ format: 'png', resource_type: 'image' }, async (err, result) => {
        if (err) return res.status(500).json({ message: 'error uploading' });
        let newUser = await query.updateUser(user.id, req.body.name, req.body.status, result.url)
        req.session.user = newUser;
        return res.json({ user: newUser });
    }).end(file.buffer)
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

app.get('/people', async (req, res) => {
    let user = req.session.user;
    if (!user) return res.status(401).json({ message: 'unauthorized' });

    let people = await query.getAllUsers(user.id);

    res.json({ people });
})

app.post('/friends/:friendId', async (req, res) => {
    let user = req.session.user;
    if (!user) return res.status(401).json({ message: 'unauthorized' });
    let friendId = req.params.friendId;
    let newFriend = await query.addFriend(user.id, friendId);
    res.send({ newFriend });
})


app.get('/chats/:chatId', async (req, res) => {
    let user = req.session.user;

    if (!user) return res.status(401);

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

    const user = req.session.user;

    sockets.set(user.id, ws);

    console.log(`🌐 A client Connected Current Users ${sockets.size}`);



    ws.on('message', async function handleIncomingMessage(data) {

        data = JSON.parse(data.toString());

        const { content, chatId, friendId } = data;

        if (chatId == 0) {
            let message = await query.insertGlobalMessage(content, user.id);
            sockets.forEach((socket) => {
                socket.send(JSON.stringify({ message, chatId: 0, type: 'message' }));
            })
            return;
        }

        let message = await query.insertNewMessage(chatId, content, user.id);

        ws.send(JSON.stringify({ message, chatId, type: 'message' }));

        if (sockets.has(friendId)) {
            sockets.get(friendId).send(JSON.stringify({ message, chatId, type: 'message' }));
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