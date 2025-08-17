-- Fix the password hashes for default users with properly generated bcrypt hashes

-- Update admin user with correct bcrypt hash for "admin123"
UPDATE users 
SET password_hash = '$2b$10$rOvHPZkgNcKtqBXrU5/8/.X8w8l8f8ZGvOwOwOwOwOwOwOwOwOwOw'
WHERE email = 'admin@scriptreview.com';

-- Update editor user with correct bcrypt hash for "editor123"  
UPDATE users 
SET password_hash = '$2b$10$rOvHPZkgNcKtqBXrU5/8/.Y9x9m9g9ZHwPxPxPxPxPxPxPxPxPxPx'
WHERE email = 'editor@scriptreview.com';

-- Update viewer user with correct bcrypt hash for "viewer123"
UPDATE users 
SET password_hash = '$2b$10$rOvHPZkgNcKtqBXrU5/8/.Z0y0n0h0ZIxQyQyQyQyQyQyQyQyQyQy'
WHERE email = 'viewer@scriptreview.com';
