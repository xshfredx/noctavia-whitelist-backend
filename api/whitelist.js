// pages/api/whitelist.js

export default async function handler(req, res) {
  // 1. Always send CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')           // ← OR a specific origin like 'https://www.noctavia.xyz'
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // 2. Handle the preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // 3. Your existing logic
  const SHEET_URL = process.env.SHEET_URL
  const options = {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    ...(req.method === 'POST' && { body: JSON.stringify(req.body) }),
  }
  const sheetRes = await fetch(SHEET_URL, options)
  const data     = await sheetRes.json()
  res.json(data)
}
