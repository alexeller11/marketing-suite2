export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // A palavra mágica que faltava era o { ssl: 'require' }
      _client = postgres(process.env.DATABASE_URL, { ssl: 'require' });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null; _client = null;
    }
  }
  return _db;
}
