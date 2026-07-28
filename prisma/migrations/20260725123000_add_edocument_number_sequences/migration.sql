CREATE TABLE "EDocumentNumberSequence" (
  "id" TEXT NOT NULL,
  "documentType" "BusinessDocumentType" NOT NULL,
  "prefix" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EDocumentNumberSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EDocumentNumberSequence_documentType_prefix_year_key"
ON "EDocumentNumberSequence"("documentType", "prefix", "year");

CREATE INDEX "EDocumentNumberSequence_documentType_year_idx"
ON "EDocumentNumberSequence"("documentType", "year");
