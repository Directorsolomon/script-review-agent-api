-- Fix user creation with proper conflict handling
-- Use INSERT ... ON CONFLICT to handle existing users gracefully

-- Admin user: admin123
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'admin-001',
  'admin@scriptreview.com',
  'System Administrator',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Editor user: editor123  
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'editor-001',
  'editor@scriptreview.com',
  'Content Editor',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'editor',
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Viewer user: viewer123
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'viewer-001',
  'viewer@scriptreview.com',
  'Content Viewer',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'viewer',
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  updated_at = NOW();
