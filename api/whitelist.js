// pages/api/whitelist.js
import crypto from 'crypto'

export default async function handler(req, res) {
  const SHEET_URL   = process.env.SHEET_URL!
  const HMAC_SECRET = process.env.HMAC_SECRET!

  // ── ALWAYS send these ─────────────────────
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Timestamp, X-Signature'
  )

  // ── OPTIONS (preflight) ────────────────────
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    // ── GET ────────────────────────────────────
    if (req.method === 'GET') {
      const sheetRes = await fetch(SHEET_URL)
      const data     = await sheetRes.json()
      return res
        .status(sheetRes.ok ? 200 : sheetRes.status)
        .json(data)
    }

    // ── POST ───────────────────────────────────
    if (req.method === 'POST') {
      // (a) HMAC check
      const ts = req.headers['x-timestamp']  as string
      const sig= req.headers['x-signature']  as string
      if (!ts || !sig) {
        return res.status(400).json({ message: 'Missing X-Timestamp or X-Signature' })
      }
      const payload  = req.body
      const expect   = crypto
        .createHmac('sha256', HMAC_SECRET)
        .update(ts + JSON.stringify(payload))
        .digest('hex')
      if (sig !== expect) {
        return res.status(401).json({ message: 'Invalid signature' })
      }

      // (b) forward to SheetBest
      const sheetRes = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const result = await sheetRes.json()
      return res
        .status(sheetRes.ok ? 200 : sheetRes.status)
        .json(result)
    }

    // ── anything else ──────────────────────────
    res.setHeader('Allow', ['GET','POST','OPTIONS'])
    return res.status(405).json({ message: 'Method Not Allowed' })

  } catch (err) {
    console.error('❌ /api/whitelist error', err)
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}
