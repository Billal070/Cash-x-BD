CREATE TABLE IF NOT EXISTS pending_payments (
  invoice_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('activation', 'bonus_package')),
  package_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pending_payments"
  ON pending_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert pending_payments"
  ON pending_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can select pending_payments"
  ON pending_payments
  FOR SELECT
  TO authenticated
  USING (true);
