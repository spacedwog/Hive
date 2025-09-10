// pages/status.js
import { useEffect, useState } from "react";

export default function StatusPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error("Erro ao buscar status:", err));
  }, []);

  if (!data) return <p>Carregando...</p>;

  return (
    <main style={{ fontFamily: "Arial", padding: "20px" }}>
      <h1>Status do Sistema 🚀</h1>
      <p><strong>Mensagem:</strong> {data.message}</p>
      <p><strong>Timestamp:</strong> {new Date(data.timestamp).toLocaleString()}</p>
      <h2>Health Check</h2>
      <pre style={{ background: "#eee", padding: "10px", borderRadius: "8px" }}>
        {JSON.stringify(data.health, null, 2)}
      </pre>
    </main>
  );
}