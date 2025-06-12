// pages/api/whitelist.js

import crypto from 'crypto'

export default async function handler(req, res) {
  const SHEET_URL   = process.env.SHEET_URL!
  const HMAC_SECRET = process.env.HMAC_SECRET!    // your HMAC secret

  //
  // 1) CORS headers for *every* response
  //
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Timestamp, X-Signature')

  //
  // 2) Preflight
  //
  if (req.method === 'OPTIONS') {
    // allow any origin to check what’s allowed
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).end()
  }

  //
  // 3) GET — proxy your sheet data (open to any origin)
  //
  if (req.method === 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    try {
      const sheetRes = await fetch(SHEET_URL)
      const data     = await sheetRes.json()
      return res.status(200).json(data)
    } catch (err) {
      console.error('Whitelist GET error:', err)
      return res.status(500).json({ message: 'Unable to fetch progress' })
    }
  }

  //
  // 4) POST — require your frontend origin + optional HMAC & rate-limit
  //
  if (req.method === 'POST') {
    // only allow your production frontend
    res.setHeader('Access-Control-Allow-Origin', 'https://www.noctavia.xyz')

    // ── 4.a) Optional: rate-limit by IP ──
    //   e.g. if (isRateLimited(req.ip)) return res.status(429).json({ message: 'Too many requests' })

    // ── 4.b) HMAC signature check ──
    const timestamp = req.headers['x-timestamp'] as string
    const signature = req.headers['x-signature'] as string
    if (!timestamp || !signature) {
      return res.status(400).json({ message: 'Missing X-Timestamp or X-Signature header' })
    }
    // optional: reject if timestamp is too old/future
    const payload = req.body
    const expected = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(timestamp + JSON.stringify(payload))
      .digest('hex')

    if (signature !== expected) {
      return res.status(401).json({ message: 'Invalid signature' })
    }

    // ── 4.c) Forward to your sheet service ──
    try {
      const sheetRes = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await sheetRes.json()

      if (!sheetRes.ok) {
        return res
          .status(sheetRes.status)
          .json({ message: result.message || 'Sheet error' })
      }

      return res.status(200).json({
        message: result.message || 'Submitted successfully!',
      })
    } catch (err) {
      console.error('Whitelist POST error:', err)
      return res.status(500).json({ message: 'Submission failed' })
    }
  }

  //
  // 5) Any other method → 405
  //
  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS'])
  return res.status(405).json({ message: 'Method not allowed' })
}
