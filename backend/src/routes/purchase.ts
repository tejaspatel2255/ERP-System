import { verifyToken } from '../middlewares/auth';
import express from 'express';
import { PurchaseService } from '../services/PurchaseService';
import { AuditLogger } from '../utils/auditLogger';

const router = express.Router();

router.use(verifyToken);

router.get('/', async (req, res) => {
    const purchases = await PurchaseService.getAllPurchases();
    res.json(purchases);
});

router.post('/', async (req: any, res: any) => {
    const { vendorName, items } = req.body;
    const newPurchase = await PurchaseService.createPurchase(vendorName, items);

    await AuditLogger.log(req.user.id, req.user.username, 'CREATE_PURCHASE', 'Purchase', newPurchase._id.toString(), {
        vendorName,
        itemsCount: newPurchase.items.length,
        totalAmount: newPurchase.totalAmount,
    });

    res.status(201).json(newPurchase);
});

export default router;
