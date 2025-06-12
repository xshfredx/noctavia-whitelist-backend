// api/whitelist.js

import Cors from 'micro-cors'

// 1. Configure CORS to only allow your site
const cors = Cors({
  origin: 'https://www.noctavia.xyz',    // ← exactly your frontend URL, no slash at end
  allowMethods: ['GET','POST','OPTIONS'], 
  allowHeaders: ['Content-Type','x-write-token'],
})

// 2. Your actual handler, wrapped by cors()
const handler = async (req, res) => {
  // Preflight / OPTIONS will be handled by micro-cors automatically

  // 3. Block any method except GET/POST
  if (!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow','GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 4. Require your secret on EVERY request
  const token = req.headers['x-write-token']
  if (token !== process.env.WRITE_TOKEN) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }

  // 5. Fetch only the sheet count
  const sheetRes = await fetch(process.env.SHEET_URL)
  const rows     = await sheetRes.json()
  const count    = Array.isArray(rows) ? rows.length : 0

  // 6. Return just the number
  return res.status(200).json({ count })
}

// 7. Export the wrapped handler
export default cors(handler)
