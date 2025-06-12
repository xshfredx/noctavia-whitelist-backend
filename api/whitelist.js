// api/whitelist.js

export default async function handler(req, res) {
  // 1) Method guard
  if (!['GET','POST','OPTIONS'].includes(req.method)) {
    res.setHeader('Allow','GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 2) Token guard on GET/POST (skip OPTIONS entirely)
  if (req.method !== 'OPTIONS') {
    const token = req.headers['x-write-token']
    if (token !== process.env.WRITE_TOKEN) {
      return res.status(401).json({ error: 'Missing or invalid token' })
    }
  }

  // 3) If it's just OPTIONS, we don't need to do anything else
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 4) Fetch the sheet and return only the count
  const sheetRes = await fetch(process.env.SHEET_URL)
  const rows     = await sheetRes.json()
  const count    = Array.isArray(rows) ? rows.length : 0
  return res.status(200).json({ count })
}
