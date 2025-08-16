CREATE TABLE docs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('rubric', 'style', 'platform', 'legal', 'playbook', 'other')),
  region TEXT CHECK (region IN ('NG', 'KE', 'GH', 'ZA', 'GLOBAL')),
  platform TEXT CHECK (platform IN ('YouTube', 'Cinema', 'VOD', 'TV')),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'experimental' CHECK (status IN ('active', 'inactive', 'experimental')),
  s3_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  writer_name TEXT NOT NULL,
  writer_email TEXT NOT NULL,
  script_title TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('feature', 'series', 'youtube_movie')),
  draft_version TEXT NOT NULL CHECK (draft_version IN ('1st', '2nd', '3rd')),
  genre TEXT,
  region TEXT CHECK (region IN ('NG', 'KE', 'GH', 'ZA', 'GLOBAL')),
  platform TEXT DEFAULT 'YouTube' CHECK (platform IN ('YouTube', 'Cinema', 'VOD', 'TV')),
  file_s3_key TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE reports (
  submission_id TEXT PRIMARY KEY REFERENCES submissions(id),
  overall_score DOUBLE PRECISION,
  report_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_docs_status ON docs(status);
CREATE INDEX idx_docs_type_region_platform ON docs(doc_type, region, platform);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_platform ON submissions(platform);
