import express from 'express';
import db from '../models/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/inventory/items
 * Retrieve all items, auto-seeds mock items if table is empty
 */
router.get('/items', async (req, res, next) => {
  try {
    let result = await db.query('SELECT * FROM items ORDER BY name ASC');
    
    // Auto-seed if empty for instant usability
    if (result.rows.length === 0) {
      const mockItems = [
        { name: 'Steel Sheet 2mm', item_code: 'ST-002', unit: 'Pcs', description: 'Cold rolled steel sheets' },
        { name: 'Aluminium Bar 10mm', item_code: 'AL-010', unit: 'Kg', description: 'Industrial extruded aluminium' },
        { name: 'Cardboard Box Large', item_code: 'PK-BX1', unit: 'Pcs', description: 'Double corrugated packaging box' }
      ];
      
      for (const item of mockItems) {
        await db.query(`
          INSERT INTO items (item_code, name, description, unit, current_stock)
          VALUES ($1, $2, $3, $4, 100.00)
          ON CONFLICT DO NOTHING
        `, [item.item_code, item.name, item.description, item.unit]);
      }
      
      result = await db.query('SELECT * FROM items ORDER BY name ASC');
    }

    return res.status(200).json({
      success: true,
      items: result.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
