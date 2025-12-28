import prisma from './lib/client.js'

async function main() {
    console.log('🗑️  Cleaning database...')

    // 1. Delete data in strict order (Child -> Parent)
    await prisma.global_messages.deleteMany()
    await prisma.messages.deleteMany()
    await prisma.chats.deleteMany()
    await prisma.session.deleteMany()

    // Since users have a self-relation (friends), sometimes deleting them requires detaching relations first,
    // but usually deleteMany() works fine if the join table is implicit.
    await prisma.users.deleteMany()

    console.log('✅ Database cleaned.')
    console.log('🌱 Starting seed...')

    // 2. Create Users
    const hany = await prisma.users.create({
        data: {
            email: 'hany@example.com',
            password: 'password123', // In real app, make sure you hash this!
            name: 'Hany',
            image: 'https://i.pravatar.cc/150?u=hany',
            status: 'Coding my new app 💻',
        }
    })

    const coast = await prisma.users.create({
        data: {
            email: 'coast@example.com',
            password: 'password123',
            name: 'Coast Colona',
            image: 'https://i.pravatar.cc/150?u=coast',
            status: 'Available for chat',
        }
    })

    const alyran = await prisma.users.create({
        data: {
            email: 'alyran@example.com',
            password: 'password123',
            name: 'Alyran Lurgo',
            image: 'https://i.pravatar.cc/150?u=alyran',
            status: 'Busy at work ⛔',
        }
    })

    const many = await prisma.users.create({
        data: {
            email: 'many@example.com',
            password: 'password123',
            name: 'Many Waher',
            image: 'https://i.pravatar.cc/150?u=many',
            status: 'At the gym',
        }
    })

    console.log('✅ Users created.')

    // 3. Create Friendships
    // Hany is friends with Coast and Alyran
    await prisma.users.update({
        where: { id: hany.id },
        data: {
            friends_to: {
                connect: [{ id: coast.id }, { id: alyran.id }]
            }
        }
    })
    // Coast adds Hany back
    await prisma.users.update({
        where: { id: coast.id },
        data: {
            friends_to: { connect: [{ id: hany.id }] }
        }
    })

    console.log('✅ Friendships established.')

    // 4. Create Global Messages
    await prisma.global_messages.createMany({
        data: [
            { content: "Welcome to the server everyone!", usersId: hany.id },
            { content: "Has anyone seen the new design?", usersId: coast.id },
            { content: "Good morning!", usersId: alyran.id },
        ]
    })

    console.log('✅ Global messages posted.')

    // 5. Create Chats & Private Messages

    // --- Chat 1: Hany & Coast ---
    await prisma.chats.create({
        data: {
            user1_id: hany.id,
            user2_id: coast.id,
            messages: {
                create: [
                    { content: "Hey Coast, how is the design going?", usersId: hany.id },
                    { content: "It looks great! I just sent you the images.", usersId: coast.id },
                    { content: "Awesome, I will implement them now.", usersId: hany.id }
                ]
            }
        }
    })

    // --- Chat 2: Hany & Alyran ---
    await prisma.chats.create({
        data: {
            user1_id: hany.id,
            user2_id: alyran.id,
            messages: {
                create: [
                    { content: "Are you coming to the meeting?", usersId: alyran.id },
                    { content: "Yes, be there in 5 mins.", usersId: hany.id }
                ]
            }
        }
    })

    console.log('✅ Chats and private messages created.')
    console.log('🏁 Seeding finished successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })