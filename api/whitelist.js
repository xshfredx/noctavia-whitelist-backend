// pages/api/whitelist.js

export default async function handler(req, res) {
  const SHEET_URL = process.env.SHEET_URL

  const options = {
    method: req.method,
    headers: { "Content-Type": "application/json" },
    // only include a body on POST
    ...(req.method === "POST" && { body: JSON.stringify(req.body) }),
  }

  const sheetRes = await fetch(SHEET_URL, options)
  const data     = await sheetRes.json()

  // just return whatever the sheet gave us
  res.json(data)
}
