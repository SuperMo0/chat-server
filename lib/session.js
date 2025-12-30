import prisma from './client.js'
import expressSession from 'express-session'
import { PrismaSessionStore } from '@quixo3/prisma-session-store'

export const session = expressSession({
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