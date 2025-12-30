import client from './../lib/client.js'



export async function getAllUserFriends(id) {

    let data = await client.users.findMany(
        {
            include: { friends_to: true },
            where: { id: id }
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
    try {
        let data = await client.chats.findFirst({
            select: { id: true },
            where: {
                OR: [
                    { AND: [{ user1_id: id1 }, { user2_id: id2 }] },
                    { AND: [{ user1_id: id2 }, { user2_id: id1 }] }
                ]
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
            }

        }
    )
    return res;
}

export async function insertNewUser(name, password) {
    let image = `https://i.pravatar.cc/150?u=${name}`;
    try {
        let res = await client.users.create({
            data: {
                image: image,
                name: name,
                email: crypto.randomUUID(),
                password: password,
                status: "Hi I just joined Chat ",
                friends_to: {
                    connect: { id: 0 }
                }
            }
        })

        return res;

    } catch (error) {
        throw error;
    }

}

export async function addFriend(id1, id2) {
    let res = await client.users.update({
        data: {
            friends_to: { connect: { id: id2 } },
            friends_by: { connect: { id: id2 } },
            chats_first: { create: { user2_id: id2 } },
            chats_second: { create: { user1_id: id1 } }
        },
        where: { id: id1 }
    })
}

export async function getUser(name, password) {
    let res = await client.users.findUnique({
        where: {
            name: name,
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

/*export async function f() {
    let res = await client.users.update({
        data: {
            friends_to: { connect: { id: 0 } },
        },
        where: { id: 8 }
    })
    console.log(res);

}
f();*/




