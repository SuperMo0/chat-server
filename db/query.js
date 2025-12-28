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
    )
    return data;
}


export async function getChatId(id1, id2) {

    id1 = Number(id1);
    id2 = Number(id2);

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
}

export async function getChatMessages(id = 0) {
    id = Number(id);
    let data = await client.chats.findUnique(
        {
            include: { messages: { orderBy: { created_at: 'asc' } } },
            where: { id: id },
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
    console.log(res);

}