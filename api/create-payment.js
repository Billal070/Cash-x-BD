import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, username, amount, redirectUrl, type, packageId } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (Number(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  const apiKey = process.env.ZINIPAY_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'earnova.vercel.app';
  const baseUrl = `${protocol}://${host}`;
  const webhookUrl = `${baseUrl}/api/zinipay-webhook`;
  const cancelUrl = redirectUrl;

  try {
    const response = await fetch('https://api.zinipay.com/v1/payment/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zini-api-key': apiKey
      },
      body: JSON.stringify({
        cus_name: username || 'Earnova User',
        cus_email: email || 'user@earnova.com',
        amount: Number(amount),
        redirect_url: redirectUrl,
        cancel_url: cancelUrl,
        webhook_url: webhookUrl,
        metadata: { userId }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorText = data.message || JSON.stringify(data) || 'ZiniPay API Error';
      console.error('ZiniPay create invoice error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const invoiceId = data.payment_url?.split('/').pop();
    if (invoiceId && (type === 'activation' || type === 'bonus_package')) {
      const { error: pendingError } = await supabase.from('pending_payments').insert({
        invoice_id: invoiceId,
        user_id: userId,
        type: type,
        package_id: type === 'bonus_package' ? (packageId || null) : null,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      if (pendingError) {
        console.error('pending_payments insert failed:', pendingError);
        return res.status(500).json({ error: `Failed to record payment: ${pendingError.message || JSON.stringify(pendingError)}` });
      }
      console.log('pending_payments inserted:', { invoice_id: invoiceId, user_id: userId, type, package_id: packageId });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
