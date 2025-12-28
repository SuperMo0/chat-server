-- CreateTable
CREATE TABLE "global_messages" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "usersId" INTEGER NOT NULL,

    CONSTRAINT "global_messages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "global_messages" ADD CONSTRAINT "global_messages_usersId_fkey" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
