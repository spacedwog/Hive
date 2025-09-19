const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

// Importa variáveis do @env (usando dotenv para Node.js)
require('dotenv').config();
// eslint-disable-next-line expo/no-env-var-destructuring
const { VERCEL_TOKEN, VERCEL_API_URL } = process.env;

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint para listar regras do firewall
app.get('/api/firewall/rules', async (req, res) => {
  try {
    // Verifica se as variáveis de ambiente estão definidas
    if (!VERCEL_TOKEN || !VERCEL_API_URL) {
      return res.status(500).json({ error: 'VERCEL_TOKEN ou VERCEL_API_URL não definidos nas variáveis de ambiente.' });
    }

    // Para debug: loga as variáveis (remova em produção)
    // console.log('VERCEL_API_URL:', VERCEL_API_URL);
    // console.log('VERCEL_TOKEN:', VERCEL_TOKEN ? '***' : 'NÃO DEFINIDO');

    const response = await fetch(`${VERCEL_API_URL}/v1/firewall/rules`, {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    // Tenta obter o corpo da resposta para debug
    let errorBody = '';
    if (!response.ok) {
      try {
        errorBody = await response.text();
      } catch (e) {
        errorBody = 'Não foi possível obter o corpo do erro.: ' + e.message;
      }
      return res.status(response.status).json({ error: 'Erro ao buscar regras do firewall', details: errorBody });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  }
});

// Inicializa o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API do Firewall Vercel rodando na porta ${PORT}`);
});