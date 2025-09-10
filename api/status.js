// api/status.js

// --- "Banco de dados" em memória (só para exemplo) ---
let items = [];

// --- Funções utilitárias ---
function logRequest(req) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
}

function validateInput(data) {
  if (!data?.nome || !data?.email) {
    return { valid: false, error: "Campos 'nome' e 'email' são obrigatórios." };
  }
  return { valid: true };
}

function successResponse(message, data = {}) {
  return { success: true, message, data, timestamp: Date.now() };
}

function errorResponse(error) {
  return { success: false, error, timestamp: Date.now() };
}

// --- CRUD ---
function getItems() {
  return successResponse("Lista de itens", items);
}

function createItem(data) {
  const newItem = { id: Date.now(), ...data };
  items.push(newItem);
  return successResponse("Item criado com sucesso", newItem);
}

function updateItem(id, data) {
  const index = items.findIndex((i) => i.id === Number(id));
  if (index === -1) return errorResponse("Item não encontrado");
  items[index] = { ...items[index], ...data };
  return successResponse("Item atualizado com sucesso", items[index]);
}

function deleteItem(id) {
  const index = items.findIndex((i) => i.id === Number(id));
  if (index === -1) return errorResponse("Item não encontrado");
  const deleted = items.splice(index, 1)[0];
  return successResponse("Item removido com sucesso", deleted);
}

// --- Handler principal ---
export default function handler(req, res) {
  logRequest(req);

  if (req.method === "GET") {
    return res.status(200).json(getItems());
  }

  if (req.method === "POST") {
    const validation = validateInput(req.body);
    if (!validation.valid) {
      return res.status(400).json(errorResponse(validation.error));
    }
    return res.status(201).json(createItem(req.body));
  }

  if (req.method === "PUT") {
    const { id } = req.query;
    if (!id) return res.status(400).json(errorResponse("ID é obrigatório"));
    return res.status(200).json(updateItem(id, req.body));
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json(errorResponse("ID é obrigatório"));
    return res.status(200).json(deleteItem(id));
  }

  return res.status(405).json(errorResponse("Método não permitido"));
}