import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // সিকিউর ব্যাকএন্ড কী

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

  const { invoiceId, userId } = req.body;

  if (!invoiceId || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.ZINIPAY_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ১. জিনী পে সার্ভার থেকে পেমেন্ট স্ট্যাটাস চেক করা
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

    // ২. পেমেন্ট সফল হয়েছে কি না তা চেক করা (COMPLETED অথবা true)
    const isCompleted = data.status === 'COMPLETED' || data.status === 'true' || data.status === true;

    if (isCompleted) {
      // ইউজারের প্রোফাইল আগে আনা
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      // রেফারেল কোড তৈরি করা (অ্যাকটিভেশনের সময়)
      const prefix = (profileData?.username || 'ER').substring(0, 2).toUpperCase();
      const random = Math.floor(10000 + Math.random() * 90000);
      const referralCode = `${prefix}${random}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: true, referral_code: referralCode })
        .eq('id', userId);

      if (updateError) throw updateError;

      await supabase.from('pending_payments')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('invoice_id', invoiceId)
        .eq('status', 'pending');

      return res.status(200).json({ success: true, message: 'Account activated successfully!' });
    } else {
      return res.status(400).json({ success: false, message: 'Payment is not completed yet.' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
