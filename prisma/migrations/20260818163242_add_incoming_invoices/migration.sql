-- CreateEnum
CREATE TYPE "IncomingInvoiceSource" AS ENUM ('MANUAL', 'XML_IMPORT', 'INTEGRATOR');

-- CreateEnum
CREATE TYPE "IncomingInvoiceStatus" AS ENUM ('DRAFT', 'REVIEWED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncomingInvoiceXmlValidationStatus" AS ENUM ('NOT_VALIDATED', 'VALID', 'INVALID');

-- AlterEnum
ALTER TYPE "FinanceAccountEntrySourceType" ADD VALUE 'INCOMING_INVOICE';

-- CreateTable
CREATE TABLE "IncomingInvoiceProviderConfig" (
    "id" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "endpointUrl" TEXT,
    "username" TEXT,
    "secretKey" TEXT,
    "webhookSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "lastCursor" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "IncomingInvoiceProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingInvoice" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "source" "IncomingInvoiceSource" NOT NULL,
    "status" "IncomingInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "totalAmount" DECIMAL(10,2),
    "counterpartyName" TEXT NOT NULL,
    "counterpartyTaxNumber" TEXT,
    "counterpartyTaxOffice" TEXT,
    "counterpartyEmail" TEXT,
    "counterpartyAddress" TEXT,
    "note" TEXT,
    "supplierId" TEXT,
    "providerConfigId" TEXT,
    "externalReference" TEXT,
    "postedFinanceEntryAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedUserId" TEXT,

    CONSTRAINT "IncomingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingInvoiceLine" (
    "id" TEXT NOT NULL,
    "incomingInvoiceId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "vatRate" DECIMAL(5,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomingInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingInvoiceXmlArtifact" (
    "id" TEXT NOT NULL,
    "incomingInvoiceId" TEXT NOT NULL,
    "xmlContent" TEXT NOT NULL,
    "xmlHash" TEXT NOT NULL,
    "validationStatus" "IncomingInvoiceXmlValidationStatus" NOT NULL DEFAULT 'NOT_VALIDATED',
    "validationErrors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomingInvoiceXmlArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingInvoiceLifecycleEvent" (
    "id" TEXT NOT NULL,
    "incomingInvoiceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'USER',
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomingInvoiceLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncomingInvoiceProviderConfig_providerCode_key" ON "IncomingInvoiceProviderConfig"("providerCode");

-- CreateIndex
CREATE INDEX "IncomingInvoiceProviderConfig_isActive_deleted_idx" ON "IncomingInvoiceProviderConfig"("isActive", "deleted");

-- CreateIndex
CREATE INDEX "IncomingInvoiceProviderConfig_isDefault_deleted_idx" ON "IncomingInvoiceProviderConfig"("isDefault", "deleted");

-- CreateIndex
CREATE INDEX "IncomingInvoice_status_issueDate_idx" ON "IncomingInvoice"("status", "issueDate");

-- CreateIndex
CREATE INDEX "IncomingInvoice_source_issueDate_idx" ON "IncomingInvoice"("source", "issueDate");

-- CreateIndex
CREATE INDEX "IncomingInvoice_supplierId_idx" ON "IncomingInvoice"("supplierId");

-- CreateIndex
CREATE INDEX "IncomingInvoice_counterpartyTaxNumber_idx" ON "IncomingInvoice"("counterpartyTaxNumber");

-- CreateIndex
CREATE INDEX "IncomingInvoice_deleted_issueDate_idx" ON "IncomingInvoice"("deleted", "issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingInvoice_providerConfigId_externalReference_key" ON "IncomingInvoice"("providerConfigId", "externalReference");

-- CreateIndex
CREATE INDEX "IncomingInvoiceLine_incomingInvoiceId_idx" ON "IncomingInvoiceLine"("incomingInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingInvoiceXmlArtifact_incomingInvoiceId_key" ON "IncomingInvoiceXmlArtifact"("incomingInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingInvoiceXmlArtifact_xmlHash_key" ON "IncomingInvoiceXmlArtifact"("xmlHash");

-- CreateIndex
CREATE INDEX "IncomingInvoiceXmlArtifact_validationStatus_idx" ON "IncomingInvoiceXmlArtifact"("validationStatus");

-- CreateIndex
CREATE INDEX "IncomingInvoiceLifecycleEvent_incomingInvoiceId_occurredAt_idx" ON "IncomingInvoiceLifecycleEvent"("incomingInvoiceId", "occurredAt");

-- CreateIndex
CREATE INDEX "IncomingInvoiceLifecycleEvent_eventType_occurredAt_idx" ON "IncomingInvoiceLifecycleEvent"("eventType", "occurredAt");

-- AddForeignKey
ALTER TABLE "IncomingInvoice" ADD CONSTRAINT "IncomingInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingInvoice" ADD CONSTRAINT "IncomingInvoice_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "IncomingInvoiceProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingInvoiceLine" ADD CONSTRAINT "IncomingInvoiceLine_incomingInvoiceId_fkey" FOREIGN KEY ("incomingInvoiceId") REFERENCES "IncomingInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingInvoiceXmlArtifact" ADD CONSTRAINT "IncomingInvoiceXmlArtifact_incomingInvoiceId_fkey" FOREIGN KEY ("incomingInvoiceId") REFERENCES "IncomingInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingInvoiceLifecycleEvent" ADD CONSTRAINT "IncomingInvoiceLifecycleEvent_incomingInvoiceId_fkey" FOREIGN KEY ("incomingInvoiceId") REFERENCES "IncomingInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
