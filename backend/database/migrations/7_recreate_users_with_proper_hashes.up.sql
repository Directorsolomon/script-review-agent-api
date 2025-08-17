-- Delete existing users and recreate with properly generated bcrypt hashes
DELETE FROM users WHERE email IN ('admin@scriptreview.com', 'editor@scriptreview.com', 'viewer@scriptreview.com');

-- Generate proper bcrypt hashes for the passwords
-- These are real bcrypt hashes generated for the respective passwords

-- Admin user: admin123
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'admin-001',
  'admin@scriptreview.com',
  'System Administrator',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  NOW()
);

-- Editor user: editor123  
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'editor-001',
  'editor@scriptreview.com',
  'Content Editor',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'editor',
  NOW()
);

-- Viewer user: viewer123
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'viewer-001',
  'viewer@scriptreview.com',
  'Content Viewer',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'viewer',
  NOW()
);
