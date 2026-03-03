-- AlterTable
ALTER TABLE "Checkout" ADD COLUMN     "dneSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "dneSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "dneSyncedAt" TIMESTAMP(3);
