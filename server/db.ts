export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Adicionamos o objeto { ssl: 'require' } para o Neon/Render
      _client = postgres(process.env.DATABASE_URL, { ssl: 'require' });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null; _client = null;
    }
  }
  return _db;
}
