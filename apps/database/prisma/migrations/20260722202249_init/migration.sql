-- CreateTable
CREATE TABLE "RawProperty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "rawTitle" TEXT,
    "rawPrice" TEXT,
    "rawArea" TEXT,
    "rawBedrooms" TEXT,
    "rawBathrooms" TEXT,
    "rawGarage" TEXT,
    "rawNeighborhood" TEXT,
    "url" TEXT NOT NULL,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "area" REAL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "garage" INTEGER,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PropertyHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyHistory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PipelineLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsFound" INTEGER,
    "itemsValid" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "RawProperty_provider_providerId_key" ON "RawProperty"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_provider_providerId_key" ON "Property"("provider", "providerId");
