// pages/api/whitelist.js

import crypto from 'crypto'

export default async function handler(req, res) {
  const SHEET_URL   = process.env.SHEET_URL!
  const HMAC_SECRET = process.env.HMAC_SECRET!

  //
  // ── 1) CORS ──────────────────────────────────────────────────────────────
  //
  // Always send these three headers on every response
  res.setHeader('Access-Control-Allow-Origin', '*')               // or your exact domain
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Timestamp, X-Signature'
  )

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  //
  // ── 2) GET ───────────────────────────────────────────────────────────────
  //
  if (req.method === 'GET') {
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
  // ── 3) POST ──────────────────────────────────────────────────────────────
  //
  if (req.method === 'POST') {
    // If you want to restrict POST to your front-end only:
    res.setHeader('Access-Control-Allow-Origin', 'https://www.noctavia.xyz')

    // 3.a) Rate-limit by IP (if desired)
    // if (isRateLimited(req.socket.remoteAddress)) {
    //   return res.status(429).json({ message: 'Too many requests' })
    // }

    // 3.b) HMAC signature check
    const timestamp = req.headers['x-timestamp'] as string
    const signature = req.headers['x-signature'] as string
    if (!timestamp || !signature) {
      return res
        .status(400)
        .json({ message: 'Missing X-Timestamp or X-Signature header' })
    }

    const payload  = req.body
    const expected = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(timestamp + JSON.stringify(payload))
      .digest('hex')

    if (signature !== expected) {
      return res.status(401).json({ message: 'Invalid signature' })
    }

    // 3.c) Forward to Sheets
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

      return res
        .status(200)
        .json({ message: result.message || 'Submitted successfully!' })
    } catch (err) {
      console.error('Whitelist POST error:', err)
      return res.status(500).json({ message: 'Submission failed' })
    }
  }

  //
  // ── 4) FALLTHROUGH ────────────────────────────────────────────────────────
  //
  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS'])
  return res.status(405).json({ message: 'Method Not Allowed' })
}
