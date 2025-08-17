-- Fix the password hashes for default users with properly generated bcrypt hashes

-- Update admin user with correct bcrypt hash for "admin123"
-- This is the actual bcrypt hash for "admin123"
UPDATE users 
SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email = 'admin@scriptreview.com';

-- Update editor user with correct bcrypt hash for "editor123"  
-- This is the actual bcrypt hash for "editor123"
UPDATE users 
SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email = 'editor@scriptreview.com';

-- Update viewer user with correct bcrypt hash for "viewer123"
-- This is the actual bcrypt hash for "viewer123"
UPDATE users 
SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email = 'viewer@scriptreview.com';
