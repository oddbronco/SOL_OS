-- Fix infinite recursion in users table RLS policies
-- Run this in your Supabase SQL Editor

-- First, drop all existing policies on the users table
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Master admins can read all users" ON public.users;

-- Create new, safe policies that don't cause recursion
-- Policy for users to read their own profile (using auth.uid() directly)
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy for users to update their own profile (using auth.uid() directly)
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy for users to insert their own profile (using auth.uid() directly)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Policy for master admins to read all users (using JWT metadata directly)
CREATE POLICY "Master admins can read all users" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin' = 'true'
  );

-- Policy for master admins to update any user
CREATE POLICY "Master admins can update all users" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin' = 'true'
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_master_admin' = 'true'
  );

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;