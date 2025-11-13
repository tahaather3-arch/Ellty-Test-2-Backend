import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CalculationModel } from '../models/Calculation';

export const getAllCalculations = async (req: AuthRequest, res: Response) => {
  try {
    const trees = await CalculationModel.findAllTrees();
    res.json(trees);
  } catch (error) {
    console.error('Error fetching calculations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createStartingNumber = async (req: AuthRequest, res: Response) => {
  try {
    const { starting_number } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (typeof starting_number !== 'number' || isNaN(starting_number)) {
      return res.status(400).json({ error: 'Valid starting number is required' });
    }

    const calculation = await CalculationModel.createStartingNumber({
      user_id: req.userId,
      starting_number,
    });

    res.status(201).json(calculation);
  } catch (error) {
    console.error('Error creating starting number:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addOperation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { operation, right_operand } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!operation || !['+', '-', '*', '/'].includes(operation)) {
      return res.status(400).json({ error: 'Valid operation (+, -, *, /) is required' });
    }

    if (typeof right_operand !== 'number' || isNaN(right_operand)) {
      return res.status(400).json({ error: 'Valid right operand is required' });
    }

    // Verify parent exists
    const parent = await CalculationModel.findById(id);
    if (!parent) {
      return res.status(404).json({ error: 'Parent calculation not found' });
    }

    const calculation = await CalculationModel.createOperation({
      user_id: req.userId,
      parent_id: id,
      operation: operation as '+' | '-' | '*' | '/',
      right_operand,
    });

    res.status(201).json(calculation);
  } catch (error: any) {
    console.error('Error adding operation:', error);
    if (error.message === 'Parent calculation not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Division by zero is not allowed') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

