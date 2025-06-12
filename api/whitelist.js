// pages/api/whitelist.js

import crypto from 'crypto'

export default async function handler(req, res) {
  const SHEET_URL   = process.env.SHEET_URL
  const HMAC_SECRET = process.env.HMAC_SECRET

  // 1) CORS — always send these on every response
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Timestamp, X-Signature'
  )

  // 2) OPTIONS (preflight) → short-circuit
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    // 3) GET → proxy your sheet
    if (req.method === 'GET') {
      const sheetRes = await fetch(SHEET_URL!)
      const data     = await sheetRes.json()
      return res
        .status(sheetRes.ok ? 200 : sheetRes.status)
        .json(data)
    }

    // 4) POST → do your checks, then forward
    if (req.method === 'POST') {
      // (a) HMAC check
      const timestamp = req.headers['x-timestamp'] as string
      const signature = req.headers['x-signature'] as string
      if (!timestamp || !signature) {
        return res
          .status(400)
          .json({ message: 'Missing X-Timestamp or X-Signature' })
      }
      const payload  = req.body
      const expected = crypto
        .createHmac('sha256', HMAC_SECRET!)
        .update(timestamp + JSON.stringify(payload))
        .digest('hex')
      if (signature !== expected) {
        return res.status(401).json({ message: 'Invalid signature' })
      }

      // (b) forward to your sheet service
      const sheetRes = await fetch(SHEET_URL!, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const result = await sheetRes.json()
      return res
        .status(sheetRes.ok ? 200 : sheetRes.status)
        .json(result)
    }

    // 5) anything else → 405
    res.setHeader('Allow', ['GET','POST','OPTIONS'])
    return res.status(405).json({ message: 'Method Not Allowed' })

  } catch (err) {
    console.error('❌ /api/whitelist error:', err)
    // header already set above
    return res
      .status(500)
      .json({ message: 'Internal server error' })
  }
}
