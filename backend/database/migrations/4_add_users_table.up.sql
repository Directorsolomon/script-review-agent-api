CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'viewer', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create default admin user (password: admin123)
-- Email: admin@scriptreview.com
-- Password: admin123
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'admin-001',
  'admin@scriptreview.com',
  'System Administrator',
  '$2b$10$K8gF2vQ3mN9pL7rS4tU6vW8xY1zA2bC3dE4fG5hI6jK7lM8nO9pQ0r',
  'admin',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create default editor user (password: editor123)
-- Email: editor@scriptreview.com
-- Password: editor123
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'editor-001',
  'editor@scriptreview.com',
  'Content Editor',
  '$2b$10$A1bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU1vW2xY3zA4bC5dE6fG7hI8j',
  'editor',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create default viewer user (password: viewer123)
-- Email: viewer@scriptreview.com
-- Password: viewer123
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'viewer-001',
  'viewer@scriptreview.com',
  'Content Viewer',
  '$2b$10$B2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4aB5cD6eF7gH8iJ9k',
  'viewer',
  NOW()
) ON CONFLICT (id) DO NOTHING;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
