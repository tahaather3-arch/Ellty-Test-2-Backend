import { pool } from '../db';

export type Operation = '+' | '-' | '*' | '/';

export interface Calculation {
  id: string;
  user_id: string;
  parent_id: string | null;
  starting_number: number | null;
  operation: Operation | null;
  right_operand: number | null;
  result: number;
  created_at: Date;
}

export interface CalculationTree extends Calculation {
  children: CalculationTree[];
  username?: string;
}

export interface CreateStartingNumber {
  user_id: string;
  starting_number: number;
}

export interface CreateOperation {
  user_id: string;
  parent_id: string;
  operation: Operation;
  right_operand: number;
}

export const CalculationModel = {
  async createStartingNumber(data: CreateStartingNumber): Promise<Calculation> {
    const result = await pool.query(
      `INSERT INTO calculations (user_id, starting_number, result)
       VALUES ($1, $2, $2)
       RETURNING *`,
      [data.user_id, data.starting_number]
    );
    return result.rows[0];
  },

  async createOperation(data: CreateOperation): Promise<Calculation> {
    // Get parent calculation to compute result
    const parentResult = await pool.query(
      'SELECT result FROM calculations WHERE id = $1',
      [data.parent_id]
    );

    if (parentResult.rows.length === 0) {
      throw new Error('Parent calculation not found');
    }

    const parentResultValue = parseFloat(parentResult.rows[0].result);
    let newResult: number;

    switch (data.operation) {
      case '+':
        newResult = parentResultValue + data.right_operand;
        break;
      case '-':
        newResult = parentResultValue - data.right_operand;
        break;
      case '*':
        newResult = parentResultValue * data.right_operand;
        break;
      case '/':
        if (data.right_operand === 0) {
          throw new Error('Division by zero is not allowed');
        }
        newResult = parentResultValue / data.right_operand;
        break;
      default:
        throw new Error('Invalid operation');
    }

    const result = await pool.query(
      `INSERT INTO calculations (user_id, parent_id, operation, right_operand, result)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.user_id, data.parent_id, data.operation, data.right_operand, newResult]
    );
    return result.rows[0];
  },

  async findAllTrees(): Promise<CalculationTree[]> {
    // Get all root calculations (starting numbers) with user info
    const rootQuery = `
      SELECT 
        c.*,
        u.username
      FROM calculations c
      JOIN users u ON c.user_id = u.id
      WHERE c.parent_id IS NULL
      ORDER BY c.created_at DESC
    `;
    
    const rootResult = await pool.query(rootQuery);
    const roots = rootResult.rows;

    // For each root, build the tree recursively
    const trees: CalculationTree[] = [];
    for (const root of roots) {
      const tree = await this.buildTree(root.id);
      trees.push(tree);
    }

    return trees;
  },

  async buildTree(rootId: string): Promise<CalculationTree> {
    // Get the root calculation with user info
    const rootResult = await pool.query(
      `SELECT c.*, u.username
       FROM calculations c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [rootId]
    );

    if (rootResult.rows.length === 0) {
      throw new Error('Calculation not found');
    }

    const root = rootResult.rows[0];

    // Recursively get all children
    const children = await this.getChildren(rootId);
    
    return {
      ...root,
      children: children,
    };
  },

  async getChildren(parentId: string): Promise<CalculationTree[]> {
    const childrenResult = await pool.query(
      `SELECT c.*, u.username
       FROM calculations c
       JOIN users u ON c.user_id = u.id
       WHERE c.parent_id = $1
       ORDER BY c.created_at ASC`,
      [parentId]
    );

    const children: CalculationTree[] = [];
    for (const child of childrenResult.rows) {
      const childTree = await this.buildTree(child.id);
      children.push(childTree);
    }

    return children;
  },

  async findById(id: string): Promise<Calculation | null> {
    const result = await pool.query(
      'SELECT * FROM calculations WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },
};

