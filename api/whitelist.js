// api/whitelist.js

export default async function handler(req, res) {
  // ‣ Vercel will inject your CORS headers from vercel.json 
  //   (or from micro-cors/nextjs-cors if you prefer). 
  //   We assume CORS is already configured correctly.

  // 1) Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 2) Only allow GET or POST
  if (!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow','GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 3) If it's a POST, require the write-token
  if (req.method === 'POST') {
    const token = req.headers['x-write-token']
    if (token !== process.env.WRITE_TOKEN) {
      return res.status(401).json({ error: 'Missing or invalid token' })
    }
  }

  // 4) Fetch your sheet
  const sheetRes = await fetch(process.env.SHEET_URL)
  const rows     = await sheetRes.json()
  const count    = Array.isArray(rows) ? rows.length : 0

  // 5) Return only the count
  return res.status(200).json({ count })
}
