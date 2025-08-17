-- Revert password hash changes
UPDATE users 
SET password_hash = '$2b$10$K8gF2vQ3mN9pL7rS4tU6vW8xY1zA2bC3dE4fG5hI6jK7lM8nO9pQ0r'
WHERE email = 'admin@scriptreview.com';

UPDATE users 
SET password_hash = '$2b$10$A1bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU1vW2xY3zA4bC5dE6fG7hI8j'
WHERE email = 'editor@scriptreview.com';

UPDATE users 
SET password_hash = '$2b$10$B2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4aB5cD6eF7gH8iJ9k'
WHERE email = 'viewer@scriptreview.com';
