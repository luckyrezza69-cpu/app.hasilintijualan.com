import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: any = null;

export const getPool = () => {
  if (!pool && process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hij_apps',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    } catch (err) {
      console.warn("Failed to initialize MySQL pool:", err);
      pool = null;
    }
  }
  return pool;
};

// Safe pool proxy
const safePool = {
  query: async (...args: any[]) => {
    const activePool = getPool();
    if (!activePool) {
      throw new Error("MySQL is not configured or not running.");
    }
    return activePool.query(...args);
  }
};

export default safePool;
