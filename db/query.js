import client from './../lib/client.js'



export async function getAllUserFriends(id) {

    let data = await client.users.findMany(
        {
            include: { friends_to: { select: { name: true, email: true, image: true, id: true, status: true } } },
            where: { id: id },
        }
    )

    return data[0].friends_to
}

export async function getAllGlobalMessages() {
    let data = await client.global_messages.findMany(
        {
            include: {
                users: {
                    select: { image: true, name: true }
                }
            }
        }
    )
    return data;
}

export async function getChatId(id1, id2) {

    id1 = Number(id1);
    id2 = Number(id2);
    if (id1 > id2) [id1, id2] = [id2, id1];
    try {
        let data = await client.chats.findFirst({
            select: { id: true },
            where: {
                AND: [{ user1_id: id1 }, { user2_id: id2 }],
            }
        })

        return data.id;

    } catch (error) {
        console.error(error);
    }

}

export async function getChatMessages(chatId) {
    chatId = Number(chatId);
    let data = await client.chats.findUnique(
        {
            include: { messages: { orderBy: { created_at: 'asc' }, include: { users: { select: { id: true, image: true, name: true } } } } },
            where: { id: chatId },
        }
    )
    return data.messages;
}

export async function insertNewMessage(chatId, content, userId) {
    chatId = Number(chatId);

    let res = await client.messages.create(
        {
            data: {
                content: content,
                usersId: userId,
                chatsId: chatId,
            },
            include: { users: { select: { name: true, email: true, image: true } } }
        }
    )
    return res;
}

export async function insertNewUser(email, name, password) {
    let image = `https://i.pravatar.cc/150?u=${name}`;
    try {
        let res = await client.users.create({
            data: {
                image: image,
                name: name,
                email: email,
                password: password,
                status: "Hi I just joined Chat ",
                friends_to: {
                    connect: { id: 0 }
                }
            },
            select: { name: true, email: true, image: true, id: true, status: true }
        })

        return res;

    } catch (error) {
        throw error;
    }

}

export async function addFriend(id1, id2) {

    id1 = Number(id1);
    id2 = Number(id2);
    let friend = await client.users.findUnique({
        where: { id: id2 },
        select: { name: true, email: true, image: true, id: true }
    })

    if (id1 > id2) [id1, id2] = [id2, id1];
    let res = await client.users.update({
        where: { id: id1 },
        data: {
            friends_to: { connect: { id: id2 } },
            friends_by: { connect: { id: id2 } },
        },
    })

    res = await client.chats.create({
        data: { user1_id: id1, user2_id: id2 }
    })
    res.id

    friend.chatId = res.id;
    return friend;
}

export async function getUser(email, password) {
    let res = await client.users.findUnique({
        where: {
            email: email,
            password: password,
        },
        select: {
            name: true,
            id: true,
            image: true,
            status: true,
        }
    })
    return res;
}


export async function insertGlobalMessage(content, userId) {
    let res = await client.global_messages.create({
        data: {
            content: content,
            usersId: userId,
        },
        include: { users: { select: { image: true, name: true } } }
    })
    return res;
}

export async function getAllUsers(userId) {
    let res = await client.users.findMany({
        select: {
            name: true,
            id: true,
            image: true,
            status: true,
        },
        where: {
            AND: {
                id: { notIn: [0, userId] },
                friends_to: {
                    none: { id: userId }
                }
            },
        }
    })
    return res;
}

export async function updateUser(id, name, status, image) {

    try {
        id = Number(id);
        let res = await client.users.update({
            data: {
                name: name,
                status: status,
                image: image,
            },
            select: {
                name: true,
                email: true,
                image: true,
                status: true,
                id: true
            },
            where: {
                id: id
            }
        })

        return res;

    } catch (error) {
        throw error;

    }

}




