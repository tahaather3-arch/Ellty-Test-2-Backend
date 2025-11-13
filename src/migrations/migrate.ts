import { pool } from '../db';

const createTables = async () => {
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
    console.log('Database tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

createTables()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

