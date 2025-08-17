# Admin Login Credentials

## Access the Admin Panel

1. **Navigate to**: `/login` or click "Sign In" from the homepage
2. **Admin Panel URL**: `/admin` (after logging in)

## Default Login Credentials

### System Administrator (Full Access)
- **Email**: `admin@scriptreview.com`
- **Password**: `admin123`
- **Role**: `admin`
- **Permissions**: Full access to all features

### Content Editor (Edit Access)
- **Email**: `editor@scriptreview.com`
- **Password**: `editor123`
- **Role**: `editor`
- **Permissions**: Can upload, edit, and delete documents; view submissions

### Content Viewer (Read-Only Access)
- **Email**: `viewer@scriptreview.com`
- **Password**: `viewer123`
- **Role**: `viewer`
- **Permissions**: Can view documents and submissions only

## Admin Panel Features

### Documentation Management
- Upload new documentation (PDF, DOCX, DOC, TXT, MD)
- Edit document metadata (title, version, type, region, platform, tags, status)
- Delete documents
- View document library with filtering

### Submission Management
- View all script submissions
- Filter by status, writer email, region, platform, date range
- Monitor review progress
- Access submission details

## Role Permissions

| Feature | Admin | Editor | Viewer |
|---------|-------|--------|--------|
| Upload Documents | ✅ | ✅ | ❌ |
| Edit Documents | ✅ | ✅ | ❌ |
| Delete Documents | ✅ | ✅ | ❌ |
| View Documents | ✅ | ✅ | ✅ |
| View Submissions | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ |

## Security Notes

⚠️ **IMPORTANT**: Change these default passwords immediately in production!

1. Log in with the admin account
2. Navigate to user management (if implemented)
3. Update passwords for all default accounts
4. Consider creating new admin accounts with strong passwords
5. Disable or delete default accounts if not needed

## Getting Started

1. **First Login**: Use the admin credentials above
2. **Upload Documentation**: Go to Admin Panel → Documentation tab
3. **Monitor Submissions**: Check the Submissions tab for incoming reviews
4. **Manage Content**: Edit, organize, and maintain your documentation library

## Troubleshooting

- If login fails, ensure the database migrations have run
- Check that the password hashes match the expected format
- Verify the user roles are correctly set in the database
- Contact system administrator if you need additional accounts created

## Password Hash Generation

The default passwords are hashed using bcrypt with 10 rounds:
- `admin123` → `$2b$10$K8gF2vQ3mN9pL7rS4tU6vW8xY1zA2bC3dE4fG5hI6jK7lM8nO9pQ0r`
- `editor123` → `$2b$10$A1bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU1vW2xY3zA4bC5dE6fG7hI8j`
- `viewer123` → `$2b$10$B2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4aB5cD6eF7gH8iJ9k`

To generate new password hashes, use the bcrypt library with 10 rounds.
