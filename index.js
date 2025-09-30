export default function handler(req, res) {
  if (req.method === "POST") {
    const data = req.body;
    return res.status(200).json({ received: data });
  }

  res.status(200).json({ message: "Hello from HIVE!" });
}