-- Allow admins to view all user_packages rows (admin panel needs this)
-- Drop existing policy first to avoid "already exists" error
DROP POLICY IF EXISTS "Admins can view all user_packages" ON user_packages;

CREATE POLICY "Admins can view all user_packages"
  ON user_packages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );
