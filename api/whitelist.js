export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }
  const { address, twitter } = req.body;
  if (!address || !twitter) {
    return res.status(400).json({ error: 'Missing address or Twitter' });
  }
  try {
    const resp = await fetch(process.env.SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, twitter })
    });
    if (!resp.ok) throw new Error('sheet.best failed');
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
