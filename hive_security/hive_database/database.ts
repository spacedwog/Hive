import * as SQLite from 'expo-sqlite';

// Abre conexão
export const db = SQLite.openDatabaseSync('hive.db');

// Cria tabelas normalizadas
export const initDB = async () => {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS ips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blocked_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_id INTEGER NOT NULL,
      reason TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (ip_id) REFERENCES ips(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      destination_ip_id INTEGER NOT NULL,
      gateway_ip_id INTEGER NOT NULL,
      FOREIGN KEY (destination_ip_id) REFERENCES ips(id) ON DELETE CASCADE,
      FOREIGN KEY (gateway_ip_id) REFERENCES ips(id) ON DELETE CASCADE
    );
  `);
};

// --- Funções auxiliares ---

// Inserir IP e retornar id
export const insertIP = async (ip: string): Promise<number> => {
  const res = await db.runAsync(
    'INSERT OR IGNORE INTO ips (ip) VALUES (?)',
    [ip]
  );
  // Buscar o id do IP
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM ips WHERE ip = ?',
    [ip]
  );
  return row?.id || res.lastInsertRowId!;
};

// Histórico de bloqueios
export const addBlockedEntry = async (ip: string, reason: string, timestamp: string) => {
  const ipId = await insertIP(ip);
  await db.runAsync(
    'INSERT INTO blocked_entries (ip_id, reason, timestamp) VALUES (?, ?, ?)',
    [ipId, reason, timestamp]
  );
};

export const getBlockedHistory = async () => {
  return await db.getAllAsync<{
    ip: string;
    reason: string;
    timestamp: string;
  }>(`
    SELECT i.ip, b.reason, b.timestamp
    FROM blocked_entries b
    JOIN ips i ON i.id = b.ip_id
    ORDER BY b.timestamp DESC
  `);
};

// Regras
export const addRule = async (destination: string, gateway: string) => {
  const destId = await insertIP(destination);
  const gateId = await insertIP(gateway);
  await db.runAsync(
    'INSERT INTO rules (destination_ip_id, gateway_ip_id) VALUES (?, ?)',
    [destId, gateId]
  );
};

export const getRules = async () => {
  return await db.getAllAsync<{ destination: string; gateway: string }>(`
    SELECT d.ip as destination, g.ip as gateway
    FROM rules r
    JOIN ips d ON d.id = r.destination_ip_id
    JOIN ips g ON g.id = r.gateway_ip_id
  `);
};

export const deleteRule = async (destination: string) => {
  const destId = await insertIP(destination); // garante que existe
  await db.runAsync('DELETE FROM rules WHERE destination_ip_id = ?', [destId]);
};