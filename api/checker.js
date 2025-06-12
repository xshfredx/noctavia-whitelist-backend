// pages/api/checker.js

export default async function handler(req, res) {
  try {
    // 1) CORS preflight
    if (req.method === "OPTIONS") {
      return res.status(200).end()
    }

    // 2) Only GET & POST
    if (!["GET","POST"].includes(req.method)) {
      res.setHeader("Allow","GET,POST")
      return res.status(405).json({ error: "Method not allowed" })
    }

    // 3) Environment
    const SHEET_URL   = process.env.SECOND_SHEET_URL || process.env.SHEET_URL
    const WRITE_TOKEN = process.env.WRITE_TOKEN

    // 4) POST = append (unchanged)
    if (req.method === "POST") {
      const { address, username } = req.body
      // fetch existing rows
      const getRows = await fetch(SHEET_URL)
      const rows    = await getRows.json()

      // detect your sheet’s wallet column dynamically:
      const walletKey =
        rows.length > 0
          ? Object.keys(rows[0]).find(k => /wallet/i.test(k)) || "wallet"
          : "wallet"

      // duplicate?
      const dup = rows.some(
        row => row[walletKey]?.toLowerCase() === address.toLowerCase()
      )
      if (dup) return res.status(200).json({ duplicate: true })

      // append with server‐side token
      await fetch(SHEET_URL, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "x-write-token": WRITE_TOKEN,
        },
        body: JSON.stringify({
          [walletKey]: address,
          // if you also want twitter, detect username column similarly...
          username: username,
        }),
      })

      return res.status(200).json({ success: true })
    }

    // 5) GET = check one address
    const getRows = await fetch(SHEET_URL)
    const rows    = await getRows.json()

    // detect wallet column same as above
    const walletKey =
      rows.length > 0
        ? Object.keys(rows[0]).find(k => /wallet/i.test(k)) || "wallet"
        : "wallet"

    const address = (req.query.address as string || "").trim().toLowerCase()
    if (address) {
      const whitelisted = rows.some(
        row => row[walletKey]?.toLowerCase() === address
      )
      return res.status(200).json({ whitelisted })
    }

    // 6) fallback count
    const count = Array.isArray(rows) ? rows.length : 0
    return res.status(200).json({ count })
  } catch (err) {
    console.error("✅ checker.js error:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}
