import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, campaigns, budgetAlerts, integrationCredentials } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL);
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _client = null;
    }
  }
  return _db;
}

export async function closeDb() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL: Use onConflict instead of onDuplicateKeyUpdate
    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Campaign queries
export async function getCampaignsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(campaigns).where(eq(campaigns.userId, userId));
}

export async function createCampaign(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(campaigns).values(data).returning();
  return result[0];
}

export async function updateCampaign(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(campaigns)
    .set(data)
    .where(eq(campaigns.id, id))
    .returning();
  return result[0];
}

// Budget alerts queries
export async function getBudgetAlertsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(budgetAlerts).where(eq(budgetAlerts.userId, userId));
}

export async function createBudgetAlert(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(budgetAlerts).values(data).returning();
  return result[0];
}

// Integration credentials queries
export async function getIntegrationCredentials(userId: number, platform: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.userId, userId),
        eq(integrationCredentials.platform, platform as any)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function saveIntegrationCredentials(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(integrationCredentials)
    .values(data)
    .onConflictDoUpdate({
      target: integrationCredentials.userId,
      set: data,
    })
    .returning();

  return result[0];
}
