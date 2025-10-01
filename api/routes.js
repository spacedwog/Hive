// api/routes.js
export default async function handler(req, res) {
  try {
    // Aqui você chama o seu servidor Windows que expõe as rotas via Node/Python
    const response = await fetch("http://localhost:3000/routes");
    const data = await response.json();

    res.status(200).json({
      success: true,
      routes: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}