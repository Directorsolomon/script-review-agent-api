CREATE TABLE csrf_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_csrf_tokens_expires ON csrf_tokens(expires_at);
CREATE INDEX idx_csrf_tokens_user ON csrf_tokens(user_id);
