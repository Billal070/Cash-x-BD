export default async function handler(req, res) {
  // CORS Headers (অন্য ডোমেইন থেকে অ্যাক্সেস করার জন্য)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, username, amount, redirectUrl } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ভার্সেলের Environment Variable থেকে এপিআই কী নেওয়া হবে
  const apiKey = process.env.ZINIPAY_API_KEY;

  try {
    const response = await fetch('https://api.zinipay.com/v1/payment/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'zini-api-key': apiKey
      },
      body: JSON.stringify({
        cus_name: username || 'Cash x BD User',
        cus_email: email || 'user@cashxbd.com',
        amount: Number(amount),
        redirect_url: redirectUrl,
        metadata: { userId }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'ZiniPay API Error' });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
