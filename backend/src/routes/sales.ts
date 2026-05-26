import { verifyToken } from '../middlewares/auth';
import express from 'express';
import { SalesService } from '../services/SalesService';
import { validate } from '../middlewares/validate';
import { createSaleSchema } from 'shared';
import { AuditLogger } from '../utils/auditLogger';

const router = express.Router();

// Middleware to verify token (Reused)

router.use(verifyToken);

router.get('/', async (req, res) => {
    const sales = await SalesService.getAllSales();
    res.json(sales);
});

router.post('/', validate(createSaleSchema), async (req: any, res: any) => {
    const { customerId, items, status } = req.body;
    const io = (req as any).io;
    const newSale = await SalesService.createSale(customerId, items, status, io);

    await AuditLogger.log(req.user.id, req.user.username, 'CREATE_SALE', 'Sale', newSale._id.toString(), {
        totalAmount: newSale.totalAmount,
        itemsCount: newSale.items.length,
    });

    res.status(201).json(newSale);
});

export default router;
