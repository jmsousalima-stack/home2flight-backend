export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "Home2Flight Backend",
    version: "0.1.0"
  });
}
