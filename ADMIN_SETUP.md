# Master Admin Setup Guide

## Overview
This guide explains how to create and manage master admin users for the platform.

## Creating Your First Master Admin

### Option 1: Supabase Dashboard (Easiest)

1. **Navigate to Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard/project/[your-project-id]
   - Click "Authentication" → "Users"

2. **Create New User**
   - Click "Add user" → "Create new user"
   - Enter email: `admin@yourdomain.com`
   - Enter password: (use a strong password)
   - Click "Create user"

3. **Set Master Admin Flag**
   - Go to "SQL Editor"
   - Run this query (replace the email):

   ```sql
   -- Update user metadata
   UPDATE auth.users
   SET raw_user_meta_data = raw_user_meta_data || '{"is_master_admin": true, "full_name": "Admin User", "company_name": "Platform"}'::jsonb
   WHERE email = 'admin@yourdomain.com';

   -- Update public users table
   UPDATE public.users
   SET is_master_admin = true,
       role = 'master_admin'
   WHERE email = 'admin@yourdomain.com';
   ```

4. **Verify**
   ```sql
   SELECT id, email, is_master_admin, role
   FROM public.users
   WHERE email = 'admin@yourdomain.com';
   ```

### Option 2: SQL Editor (Direct)

Run the SQL file located at: `create-admin-user.sql`

**Before running:**
1. Open `create-admin-user.sql`
2. Replace `admin@yourdomain.com` with your email
3. Replace `your-secure-password-here` with a strong password
4. Run in Supabase SQL Editor

## Master Admin Permissions

Master admins have access to:
- ✅ View all users and customers
- ✅ Manage subscription plans
- ✅ Handle subscription requests
- ✅ Create and manage access codes
- ✅ View all projects and data (read-only)
- ✅ View platform analytics
- ✅ Manage admin activity logs

## Security Best Practices

1. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols

2. **Limit Master Admins**
   - Only create master admin accounts when necessary
   - Regular users should be customer admins

3. **Enable MFA**
   - Enable two-factor authentication in Supabase Dashboard
   - Authentication → Policies → Enable 2FA

4. **Audit Regularly**
   - Check admin_activity_log table regularly
   - Review who has master admin access

## Revoking Master Admin Access

To remove master admin privileges:

```sql
-- Revoke master admin status
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"is_master_admin": false}'::jsonb
WHERE email = 'user@example.com';

UPDATE public.users
SET is_master_admin = false,
    role = 'customer_admin'
WHERE email = 'user@example.com';
```

## Troubleshooting

### User can't log in as admin
1. Verify the user exists: `SELECT * FROM auth.users WHERE email = 'admin@yourdomain.com';`
2. Check metadata: `SELECT raw_user_meta_data FROM auth.users WHERE email = 'admin@yourdomain.com';`
3. Check public table: `SELECT * FROM public.users WHERE email = 'admin@yourdomain.com';`

### Admin sees regular user interface
- Clear browser cache and cookies
- Log out and log back in
- Verify `is_master_admin = true` in both tables

### Changes not taking effect
- The user metadata must be set in `auth.users` table
- The application reads from JWT token which includes metadata
- User must log out and log back in for changes to take effect
