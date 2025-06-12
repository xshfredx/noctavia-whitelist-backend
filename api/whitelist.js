// api/whitelist.js

export default async function handler(req, res) {
  const { SHEET_URL, ALLOWED_ORIGIN, WRITE_TOKEN } = process.env

  // CORS and method checks… (unchanged)
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-write-token'
  )
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow','GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require the write-token on *all* requests (so nobody can even peek at count)
  const token = req.headers['x-write-token']
  if (token !== WRITE_TOKEN) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }

  // Fetch the sheet…
  const sheetRes = await fetch(SHEET_URL, { method: 'GET' })
  const rows     = await sheetRes.json()

  // *** HERE’S THE IMPORTANT PART ***
  // Send *only* the length—never the rows themselves
  return res.status(200).json({ count: Array.isArray(rows) ? rows.length : 0 })
}
