// api/whitelist.js

export default async function handler(req, res) {
  const { SHEET_URL, ALLOWED_ORIGIN, WRITE_TOKEN } = process.env

  // 1) Grab the browser's Origin header:
  const origin = req.headers.origin

  // 2) If it exactly matches the one you trust, echo it back.
  //    Otherwise we simply won’t set CORS headers and requests will fail.
  if (origin && origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  // 3) Rest of your CORS & method boilerplate:
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-write-token'
  )

  // 4) Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 5) Only allow GET/POST
  if (!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow','GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 6) Require token on all requests
  const token = req.headers['x-write-token']
  if (token !== WRITE_TOKEN) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }

  // 7) Fetch the sheet and return only the count
  const sheetRes = await fetch(SHEET_URL, { method: 'GET' })
  const rows     = await sheetRes.json()
  const count    = Array.isArray(rows) ? rows.length : 0

  return res.status(200).json({ count })
}
