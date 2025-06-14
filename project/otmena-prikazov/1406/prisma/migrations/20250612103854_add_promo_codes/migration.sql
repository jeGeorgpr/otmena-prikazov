/*
  Warnings:

  - You are about to drop the column `createdBy` on the `PromoCode` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PromoCode" DROP CONSTRAINT "PromoCode_createdBy_fkey";

-- AlterTable
ALTER TABLE "PromoCode" DROP COLUMN "createdBy",
ALTER COLUMN "isSingleUse" SET DEFAULT true;
