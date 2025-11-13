import { pool } from '../db';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
}

export interface UserCreate {
  username: string;
  password_hash: string;
}

export const UserModel = {
  async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  },

  async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, username, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async create(userData: UserCreate): Promise<User> {
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [userData.username, userData.password_hash]
    );
    return result.rows[0];
  },
};

