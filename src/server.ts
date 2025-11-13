import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db';
import authRoutes from './routes/auth';
import calculationRoutes from './routes/calculations';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/calculations', calculationRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Run database migrations
const runMigrations = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create calculations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS calculations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES calculations(id) ON DELETE CASCADE,
        starting_number DECIMAL,
        operation VARCHAR(1) CHECK (operation IN ('+', '-', '*', '/')),
        right_operand DECIMAL,
        result DECIMAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (
          (parent_id IS NULL AND starting_number IS NOT NULL AND operation IS NULL AND right_operand IS NULL) OR
          (parent_id IS NOT NULL AND starting_number IS NULL AND operation IS NOT NULL AND right_operand IS NOT NULL)
        )
      )
    `);

    // Create index for faster tree queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_calculations_parent_id ON calculations(parent_id)
    `);

    await client.query('COMMIT');
    console.log('Database migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Start server
const startServer = async () => {
  try {
    // Run migrations first
    await runMigrations();
    
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

