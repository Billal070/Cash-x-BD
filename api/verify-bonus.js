import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { invoiceId, userId, packageId } = req.body;

  if (!invoiceId || !userId || !packageId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.ZINIPAY_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const response = await fetch('https://api.zinipay.com/v1/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zini-api-key': apiKey
      },
      body: JSON.stringify({ invoice_id: invoiceId })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorText = data.message || JSON.stringify(data) || 'Verification failed';
      console.error('ZiniPay verify invoice error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const isCompleted = data.status === 'COMPLETED' || data.status === 'true' || data.status === true;

    if (isCompleted) {
      const { data: pkgData } = await supabase.from('packages').select('price').eq('id', packageId).single();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: insertError } = await supabase.from('user_packages').insert({
        user_id: userId,
        package_id: packageId,
        amount_paid: pkgData?.price || 0,
        purchased_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true
      });

      if (insertError) throw insertError;

      await supabase.from('pending_payments')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('invoice_id', invoiceId)
        .eq('status', 'pending');

      return res.status(200).json({ success: true, message: 'Package activated!' });
    } else {
      return res.status(400).json({ success: false, message: 'Payment not completed yet.' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
