import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ZINIPAY_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { invoice_id } = req.body;

  if (!invoice_id) {
    return res.status(400).json({ error: 'Missing invoice_id' });
  }

  try {
    const verifyResponse = await fetch('https://api.zinipay.com/v1/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zini-api-key': apiKey
      },
      body: JSON.stringify({ invoice_id })
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      const errorText = verifyData.message || JSON.stringify(verifyData) || 'Verification failed';
      console.error('ZiniPay webhook verify error:', verifyResponse.status, errorText);
      return res.status(verifyResponse.status).json({ error: errorText });
    }

    const isCompleted = verifyData.status === 'COMPLETED';

    if (!isCompleted) {
      await supabase.from('pending_payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('invoice_id', invoice_id);
      return res.status(200).json({ success: false, message: 'Payment not completed yet.' });
    }

    const { data: pending } = await supabase.from('pending_payments').select('*').eq('invoice_id', invoice_id).single();

    if (!pending) {
      return res.status(200).json({ success: false, message: 'No pending payment record found for this invoice.' });
    }

    if (pending.status === 'completed') {
      return res.status(200).json({ success: true, message: 'Already processed.' });
    }

    if (pending.type === 'activation') {
      const { data: profileData } = await supabase.from('profiles').select('username, is_active').eq('id', pending.user_id).single();
      if (profileData && !profileData.is_active) {
        const prefix = (profileData?.username || 'ER').substring(0, 2).toUpperCase();
        const random = Math.floor(10000 + Math.random() * 90000);
        const referralCode = `${prefix}${random}`;
        const { error: updateError } = await supabase.from('profiles').update({ is_active: true, referral_code: referralCode }).eq('id', pending.user_id);
        if (updateError) throw updateError;
      }
    } else if (pending.type === 'bonus_package') {
      const { data: pkgData } = await supabase.from('packages').select('price').eq('id', pending.package_id).single();
      await supabase.from('user_packages').update({ is_active: false }).eq('user_id', pending.user_id).eq('is_active', true);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const { error: insertError } = await supabase.from('user_packages').insert({
        user_id: pending.user_id,
        package_id: pending.package_id,
        amount_paid: pkgData?.price || 0,
        purchased_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true
      });
      if (insertError) throw insertError;
    }

    await supabase.from('pending_payments').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('invoice_id', invoice_id);

    return res.status(200).json({ success: true, message: 'Payment processed successfully.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
