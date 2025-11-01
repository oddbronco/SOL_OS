-- Create Master Admin User - SIMPLIFIED METHOD
--
-- Since the Supabase interface doesn't show the "Add User" button,
-- use this two-step process:

-- ============================================
-- STEP 1: Sign up through your application
-- ============================================
-- 1. Start your app: npm run dev
-- 2. Go to the signup page
-- 3. Sign up with: admin@yourdomain.com (or your preferred email)
-- 4. Remember your password!

-- ============================================
-- STEP 2: Run this SQL to make the user an admin
-- ============================================
-- Replace 'admin@yourdomain.com' with the email you used to sign up

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"is_master_admin": true, "full_name": "Platform Admin"}'::jsonb
WHERE email = 'admin@yourdomain.com';

UPDATE public.users
SET is_master_admin = true,
    role = 'master_admin'
WHERE email = 'admin@yourdomain.com';

-- ============================================
-- STEP 3: Verify it worked
-- ============================================
SELECT
  u.id,
  u.email,
  u.is_master_admin,
  u.role,
  u.full_name,
  u.company_name
FROM public.users u
WHERE u.email = 'admin@yourdomain.com';

-- You should see is_master_admin = true and role = 'master_admin'
-- Log out and log back in for changes to take effect!
