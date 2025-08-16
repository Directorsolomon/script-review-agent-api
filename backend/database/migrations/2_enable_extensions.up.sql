-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Try to enable pgvector, but don't fail if it's not available
DO $$
DECLARE v text;
BEGIN
  SELECT default_version INTO v FROM pg_available_extensions WHERE name = 'vector';
  IF v IS NOT NULL THEN
    EXECUTE format('CREATE EXTENSION IF NOT EXISTS vector VERSION %L', v);
  ELSE
    -- pgvector not available, we'll use TEXT columns as fallback
    RAISE NOTICE 'pgvector extension not available, using TEXT fallback for embeddings';
  END IF;
END $$;
