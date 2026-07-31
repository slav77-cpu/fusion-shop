-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "ProductPriceTier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unitQty" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "moqTiers" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesaleQuote" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "estVolume" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WholesaleQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPriceTier_productId_idx" ON "ProductPriceTier"("productId");

-- AddForeignKey
ALTER TABLE "ProductPriceTier" ADD CONSTRAINT "ProductPriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
