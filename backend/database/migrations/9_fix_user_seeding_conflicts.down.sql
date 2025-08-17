-- Revert to previous state - remove the users if they exist
DELETE FROM users WHERE email IN ('admin@scriptreview.com', 'editor@scriptreview.com', 'viewer@scriptreview.com');
