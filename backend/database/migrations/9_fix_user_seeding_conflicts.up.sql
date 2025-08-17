-- Fix user seeding with proper UPSERT to handle conflicts
-- Use UPSERT instead of DELETE + INSERT to avoid primary key conflicts

INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES 
  ('admin-001', 'admin@scriptreview.com', 'System Administrator', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NOW()),
  ('editor-001', 'editor@scriptreview.com', 'Content Editor', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'editor', NOW()),
  ('viewer-001', 'viewer@scriptreview.com', 'Content Viewer', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'viewer', NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Also handle email conflicts
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES 
  ('admin-001', 'admin@scriptreview.com', 'System Administrator', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NOW()),
  ('editor-001', 'editor@scriptreview.com', 'Content Editor', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'editor', NOW()),
  ('viewer-001', 'viewer@scriptreview.com', 'Content Viewer', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'viewer', NOW())
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  updated_at = NOW();
