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
-- In production, change this password immediately
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'admin-001',
  'admin@example.com',
  'Admin User',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  NOW()
) ON CONFLICT (id) DO NOTHING;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
