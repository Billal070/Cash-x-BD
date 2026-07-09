-- Allow admins to view all user_packages rows (admin panel needs this)
CREATE POLICY IF NOT EXISTS "Admins can view all user_packages"
  ON user_packages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );
