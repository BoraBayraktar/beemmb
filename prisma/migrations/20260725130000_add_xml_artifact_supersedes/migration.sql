ALTER TABLE "BusinessDocumentXmlArtifact"
ADD COLUMN "supersedesArtifactId" TEXT;

CREATE INDEX "BusinessDocumentXmlArtifact_supersedesArtifactId_idx"
ON "BusinessDocumentXmlArtifact"("supersedesArtifactId");

ALTER TABLE "BusinessDocumentXmlArtifact"
ADD CONSTRAINT "BusinessDocumentXmlArtifact_supersedesArtifactId_fkey"
FOREIGN KEY ("supersedesArtifactId") REFERENCES "BusinessDocumentXmlArtifact"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
