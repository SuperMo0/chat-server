/*
  Warnings:

  - A unique constraint covering the columns `[user1_id,user2_id]` on the table `chats` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "chats_user1_id_user2_id_key" ON "chats"("user1_id", "user2_id");
