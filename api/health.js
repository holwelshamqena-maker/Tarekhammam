module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ ok: true, gemini: Boolean(process.env.GEMINI_API_KEY) });
};
