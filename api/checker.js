// api/checker.js

export default async function handler(req, res) {
  // 1) CORS via vercel.json (or micro-cors/nextjs-cors). Assume only your frontend can reach here.

  // 2) Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  // 3) Only allow GET and POST
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET,POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  // 4) Read sheet URL and write-token from env (never exposed to client)
  const SHEET_URL   = process.env.SECOND_SHEET_URL
  const WRITE_TOKEN = process.env.WRITE_TOKEN

  // 5) POST = form submit
  if (req.method === "POST") {
    const { address, username } = req.body

    // OPTIONAL: server-side captcha or rate-limit checks here

    // 5a) Fetch existing rows
    const getRows = await fetch(SHEET_URL, { method: "GET" })
    const rows    = await getRows.json()

    // 5b) Duplicate check
    const dup = rows.some(
      row =>
        row.address?.toLowerCase() === address.toLowerCase() ||
        row.username?.toLowerCase() === username.toLowerCase()
    )
    if (dup) {
      return res.status(200).json({ duplicate: true })
    }

    // 5c) Append new row, **including** your secret token in this server-to-server call
    await fetch(SHEET_URL, {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-write-token":   WRITE_TOKEN,    // ← only here on the server!
      },
      body: JSON.stringify({ address, username }),
    })

    return res.status(200).json({ success: true })
  }

  // 6) GET = count only
  const getRows = await fetch(SHEET_URL, { method: "GET" })
  const rows    = await getRows.json()
  const count   = Array.isArray(rows) ? rows.length : 0
  return res.status(200).json({ count })
}
