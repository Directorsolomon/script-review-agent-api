-- Revert to original user creation
DELETE FROM users WHERE email IN ('admin@scriptreview.com', 'editor@scriptreview.com', 'viewer@scriptreview.com');

INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'admin-001',
  'admin@scriptreview.com',
  'System Administrator',
  '$2b$10$K8gF2vQ3mN9pL7rS4tU6vW8xY1zA2bC3dE4fG5hI6jK7lM8nO9pQ0r',
  'admin',
  NOW()
);

INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'editor-001',
  'editor@scriptreview.com',
  'Content Editor',
  '$2b$10$A1bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU1vW2xY3zA4bC5dE6fG7hI8j',
  'editor',
  NOW()
);

INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'viewer-001',
  'viewer@scriptreview.com',
  'Content Viewer',
  '$2b$10$B2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4aB5cD6eF7gH8iJ9k',
  'viewer',
  NOW()
);
