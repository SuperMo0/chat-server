/*
  Warnings:

  - You are about to drop the column `messagesId` on the `chats` table. All the data in the column will be lost.
  - Added the required column `content` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chats" DROP COLUMN "messagesId";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "content" TEXT NOT NULL;
