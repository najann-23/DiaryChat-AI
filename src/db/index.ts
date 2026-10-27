import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';
import fs from 'fs';
import path from 'path';

declare global {
  var _postgresPool: Pool | undefined;
}

export const getPgConfig = (): PoolConfig | null => {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (connectionString) {
    return {
      connectionString,
      ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 5000,
    };
  }

  // Only connect via host if SQL_HOST is a remote hostname (not local unix socket)
  if (
    process.env.SQL_HOST &&
    !process.env.SQL_HOST.startsWith('/') &&
    process.env.SQL_USER &&
    process.env.SQL_DB_NAME
  ) {
    const useSsl = process.env.SQL_SSL === 'true';

    return {
      host: process.env.SQL_HOST,
      port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      connectionTimeoutMillis: 5000,
    };
  }

  return null;
};

export const createPool = (): Pool | null => {
  if (global._postgresPool) {
    return global._postgresPool;
  }

  const config = getPgConfig();
  if (!config) {
    return null;
  }

  try {
    const pool = new Pool(config);
    pool.on('error', (err) => {
      console.warn('PostgreSQL idle client notice:', err.message);
    });
    global._postgresPool = pool;
    return pool;
  } catch (error) {
    console.error('Failed to instantiate PostgreSQL Pool:', error);
    return null;
  }
};

export const pool = createPool();
export const db = pool ? drizzle(pool, { schema }) : null;

// Ensure database tables exist automatically in PostgreSQL
export const initPostgresTables = async (p: Pool) => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      name TEXT,
      ai_style TEXT DEFAULT 'companion',
      proactivity TEXT DEFAULT 'moderate',
      use_old_memories BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Cuộc trò chuyện mới',
      date TEXT NOT NULL,
      summary TEXT,
      is_completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_supplement BOOLEAN DEFAULT FALSE,
      supplement_for_date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memories (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      event_date TEXT,
      date_precision TEXT DEFAULT 'exact',
      certainty TEXT DEFAULT 'confirmed',
      status TEXT DEFAULT 'pending',
      conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
      message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
      source_quote TEXT,
      tags TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
      memory_id INTEGER REFERENCES memories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT,
      date_precision TEXT DEFAULT 'exact',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plans (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
      memory_id INTEGER REFERENCES memories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS core_memories (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      source_references TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scrapbooks (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT,
      image_url TEXT,
      memory_id INTEGER REFERENCES memories(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await p.query(ddl);
    console.log('PostgreSQL schema verified and ready.');
    return true;
  } catch (error) {
    console.error('Error initializing PostgreSQL schema:', error);
    return false;
  }
};
