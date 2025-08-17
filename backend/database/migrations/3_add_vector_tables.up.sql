-- Check if vector type exists, use appropriate column type
DO $$
DECLARE
  vector_available boolean := false;
BEGIN
  -- Check if vector type is available
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'vector'
  ) INTO vector_available;
  
  IF vector_available THEN
    -- Create tables with vector columns (using 1536 dimensions to stay under ivfflat limit)
    CREATE TABLE IF NOT EXISTS admin_doc_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doc_id TEXT REFERENCES docs(id) ON DELETE CASCADE,
      section TEXT,
      line_start INTEGER,
      line_end INTEGER,
      text TEXT NOT NULL,
      priority_weight REAL DEFAULT 1.0,
      embedding vector(1536),
      tsv tsvector
    );

    CREATE TABLE IF NOT EXISTS script_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
      scene_index INTEGER,
      page_start INTEGER,
      page_end INTEGER,
      text TEXT NOT NULL,
      embedding vector(1536),
      tsv tsvector
    );
  ELSE
    -- Create tables with TEXT columns as fallback
    CREATE TABLE IF NOT EXISTS admin_doc_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doc_id TEXT REFERENCES docs(id) ON DELETE CASCADE,
      section TEXT,
      line_start INTEGER,
      line_end INTEGER,
      text TEXT NOT NULL,
      priority_weight REAL DEFAULT 1.0,
      embedding TEXT, -- JSON string fallback
      tsv tsvector
    );

    CREATE TABLE IF NOT EXISTS script_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
      scene_index INTEGER,
      page_start INTEGER,
      page_end INTEGER,
      text TEXT NOT NULL,
      embedding TEXT, -- JSON string fallback
      tsv tsvector
    );
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc_id ON admin_doc_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_tsv ON admin_doc_chunks USING GIN(tsv);

CREATE INDEX IF NOT EXISTS idx_script_chunks_sub ON script_chunks(submission_id);
CREATE INDEX IF NOT EXISTS idx_script_chunks_tsv ON script_chunks USING GIN(tsv);

-- Only create vector indexes if vector type is available
DO $$
DECLARE
  vector_available boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'vector'
  ) INTO vector_available;
  
  IF vector_available THEN
    -- Use HNSW index instead of ivfflat to avoid dimension limits
    CREATE INDEX IF NOT EXISTS idx_doc_chunks_embed ON admin_doc_chunks USING hnsw (embedding vector_l2_ops);
    CREATE INDEX IF NOT EXISTS idx_script_chunks_embed ON script_chunks USING hnsw (embedding vector_l2_ops);
  END IF;
END $$;

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
