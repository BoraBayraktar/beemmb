CREATE TYPE "BusinessDocumentXmlRootType" AS ENUM ('INVOICE', 'DESPATCH_ADVICE');
CREATE TYPE "BusinessDocumentXmlValidationStatus" AS ENUM ('NOT_VALIDATED', 'VALID', 'INVALID');

CREATE TABLE "BusinessDocumentXmlArtifact" (
  "id" TEXT NOT NULL,
  "businessDocumentId" TEXT NOT NULL,
  "documentRootType" "BusinessDocumentXmlRootType" NOT NULL,
  "schemaVersion" TEXT NOT NULL DEFAULT 'UBL-TR-1.2.1',
  "xmlContent" TEXT NOT NULL,
  "xmlHash" TEXT NOT NULL,
  "validationStatus" "BusinessDocumentXmlValidationStatus" NOT NULL DEFAULT 'NOT_VALIDATED',
  "validationErrors" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessDocumentXmlArtifact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BusinessDocumentXmlArtifact_businessDocumentId_generatedAt_idx"
ON "BusinessDocumentXmlArtifact"("businessDocumentId", "generatedAt");

CREATE INDEX "BusinessDocumentXmlArtifact_xmlHash_idx"
ON "BusinessDocumentXmlArtifact"("xmlHash");

CREATE INDEX "BusinessDocumentXmlArtifact_validationStatus_idx"
ON "BusinessDocumentXmlArtifact"("validationStatus");

ALTER TABLE "BusinessDocumentXmlArtifact"
ADD CONSTRAINT "BusinessDocumentXmlArtifact_businessDocumentId_fkey"
FOREIGN KEY ("businessDocumentId") REFERENCES "BusinessDocument"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
