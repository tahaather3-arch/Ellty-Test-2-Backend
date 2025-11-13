import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Support both Railway's DATABASE_URL and individual connection parameters
const getDatabaseConfig = () => {
  // Railway provides DATABASE_URL, local development uses individual vars
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }
  
  // Fallback to individual connection parameters for local development
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'number_discussion',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
};

export const pool = new Pool(getDatabaseConfig());

