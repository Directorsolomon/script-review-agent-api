-- Remove authentication-related tables since we're removing auth
DROP TABLE IF EXISTS csrf_tokens;
DROP TABLE IF EXISTS users;
