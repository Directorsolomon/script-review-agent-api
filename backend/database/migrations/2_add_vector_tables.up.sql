-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Admin document chunks with embeddings
CREATE TABLE admin_doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id TEXT REFERENCES docs(id) ON DELETE CASCADE,
  section TEXT,
  line_start INTEGER,
  line_end INTEGER,
  text TEXT NOT NULL,
  priority_weight REAL DEFAULT 1.0,
  embedding vector(3072),
  tsv tsvector
);

-- Script chunks with embeddings
CREATE TABLE script_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
  scene_index INTEGER,
  page_start INTEGER,
  page_end INTEGER,
  text TEXT NOT NULL,
  embedding vector(3072),
  tsv tsvector
);

-- Indexes for performance
CREATE INDEX idx_doc_chunks_doc_id ON admin_doc_chunks(doc_id);
CREATE INDEX idx_doc_chunks_tsv ON admin_doc_chunks USING GIN(tsv);
CREATE INDEX idx_doc_chunks_embed ON admin_doc_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists=100);

CREATE INDEX idx_script_chunks_sub ON script_chunks(submission_id);
CREATE INDEX idx_script_chunks_tsv ON script_chunks USING GIN(tsv);
CREATE INDEX idx_script_chunks_embed ON script_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists=100);

-- Full-text search triggers
CREATE OR REPLACE FUNCTION update_tsv_admin_doc_chunks() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('english', coalesce(NEW.section,'') || ' ' || NEW.text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tsv_admin_doc_chunks ON admin_doc_chunks;
CREATE TRIGGER trg_tsv_admin_doc_chunks BEFORE INSERT OR UPDATE ON admin_doc_chunks
FOR EACH ROW EXECUTE PROCEDURE update_tsv_admin_doc_chunks();

CREATE OR REPLACE FUNCTION update_tsv_script_chunks() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('english', NEW.text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tsv_script_chunks ON script_chunks;
CREATE TRIGGER trg_tsv_script_chunks BEFORE INSERT OR UPDATE ON script_chunks
FOR EACH ROW EXECUTE PROCEDURE update_tsv_script_chunks();
