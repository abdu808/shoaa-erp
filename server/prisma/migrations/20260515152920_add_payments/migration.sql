-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "orgName" TEXT,
    "docType" TEXT NOT NULL DEFAULT 'tax',
    "refInvoice" TEXT,
    "invoiceType" TEXT,
    "orgData" JSONB NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "clientData" JSONB NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "discountType" TEXT NOT NULL DEFAULT 'value',
    "taxableBase" REAL NOT NULL DEFAULT 0,
    "vat" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "payments" JSONB NOT NULL DEFAULT [],
    "createdBy" JSONB,
    "audit" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Invoice" ("audit", "clientData", "clientId", "clientName", "createdAt", "createdBy", "discount", "discountType", "docType", "id", "invoiceNumber", "invoiceType", "items", "notes", "orgData", "orgId", "orgName", "refInvoice", "status", "subtotal", "taxableBase", "total", "updatedAt", "vat") SELECT "audit", "clientData", "clientId", "clientName", "createdAt", "createdBy", "discount", "discountType", "docType", "id", "invoiceNumber", "invoiceType", "items", "notes", "orgData", "orgId", "orgName", "refInvoice", "status", "subtotal", "taxableBase", "total", "updatedAt", "vat" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE INDEX "Invoice_orgId_createdAt_idx" ON "Invoice"("orgId", "createdAt");
CREATE UNIQUE INDEX "Invoice_orgId_invoiceNumber_key" ON "Invoice"("orgId", "invoiceNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
