CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit evidence tables are append-only. Write a correction event instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BusinessDocumentXmlArtifact_prevent_update"
BEFORE UPDATE ON "BusinessDocumentXmlArtifact"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER "BusinessDocumentXmlArtifact_prevent_delete"
BEFORE DELETE ON "BusinessDocumentXmlArtifact"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
