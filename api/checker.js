// pages/api/checker.js

export default async function handler(req, res) {
  // 1) Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  // 2) Only allow GET & POST
  if (!["GET","POST"].includes(req.method)) {
    res.setHeader("Allow","GET,POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  // 3) Pull in your secrets
  const SHEET_URL   = process.env.SECOND_SHEET_URL || process.env.SHEET_URL
  const WRITE_TOKEN = process.env.WRITE_TOKEN

  // 4) POST = append a new row (same as before)
  if (req.method === "POST") {
    const { address, username } = req.body

    // 4a) fetch existing rows
    const getRows = await fetch(SHEET_URL, { method: "GET" })
    const rows    = await getRows.json()

    // 4b) duplicate check
    const dup = rows.some(
      row =>
        row.wallet?.toLowerCase() === address.toLowerCase() ||
        row.twitter?.toLowerCase() === username.toLowerCase()
    )
    if (dup) {
      return res.status(200).json({ duplicate: true })
    }

    // 4c) append with server‐side token
    await fetch(SHEET_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "x-write-token": WRITE_TOKEN,
      },
      body: JSON.stringify({
        wallet:  address,
        twitter: username,
      }),
    })

    return res.status(200).json({ success: true })
  }

  // 5) GET = check or count
  const getRows = await fetch(SHEET_URL, { method: "GET" })
  const rows    = await getRows.json()

  const address = (req.query.address as string || "").trim()
  if (address) {
    // If the client asked with ?address=..., return whitelisted status
    const found = rows.some(
      row => row.wallet?.toLowerCase() === address.toLowerCase()
    )
    return res.status(200).json({ whitelisted: found })
  }

  // Otherwise fall back to returning count
  const count = Array.isArray(rows) ? rows.length : 0
  return res.status(200).json({ count })
}
