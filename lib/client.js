import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './../generated/prisma/default.js'

const connectionString = `${process.env.URL}`
console.log(connectionString);


const adapter = new PrismaPg({ connectionString })
const prismaClient = new PrismaClient({ adapter })

export default prismaClient 