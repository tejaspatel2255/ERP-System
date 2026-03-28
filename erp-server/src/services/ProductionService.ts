import mongoose from 'mongoose';
import BOM from '../models/BOM';
import WorkOrder from '../models/WorkOrder';
import Product from '../models/Product';
import StoreLedger from '../models/StoreLedger';

export class ProductionService {
    static async getAllBOMs() {
        return await BOM.find()
            .populate('product', 'name sku')
            .populate('materials.material', 'name sku unit unitCost');
    }

    static async createBOM(payload: any) {
        const bom = new BOM(payload);
        return await bom.save();
    }

    static async getAllWorkOrders() {
        return await WorkOrder.find()
            .populate('product', 'name sku')
            .populate('bom', 'name')
            .sort({ createdAt: -1 });
    }

    static async createWorkOrder(payload: any) {
        const workOrder = new WorkOrder({
            ...payload,
            status: 'Pending'
        });
        return await workOrder.save();
    }

    static async updateWorkOrderStatus(id: string, status: string) {
        const session = await mongoose.startSession();
        let updatedOrder = null;
        
        await session.withTransaction(async () => {
            const workOrder = await WorkOrder.findById(id).populate('bom').session(session);
            if (!workOrder) throw new Error('Work Order not found');

            // Logic for COMPLETION
            if (status === 'Completed' && workOrder.status !== 'Completed') {
                const bom = await BOM.findById(workOrder.bom).session(session);
                if (!bom) throw new Error('BOM not found');

                // 1. Deduct Raw Materials
                for (const item of bom.materials) {
                    const totalNeeded = item.quantity * workOrder.quantity;

                    const material = await Product.findById(item.material).session(session);
                    if (!material) throw new Error(`Material not found`);

                    if (material.stock < totalNeeded) {
                        throw new Error(`Insufficient stock for material: ${material.name}`);
                    }

                    material.stock -= totalNeeded;
                    await material.save({ session });

                    // Create Ledger Entry (OUT)
                    await new StoreLedger({
                        product: material._id,
                        type: 'OUT',
                        quantity: totalNeeded,
                        referenceId: workOrder.id,
                        referenceType: 'Adjustment', // Using Adjustment as close equivalent
                        date: new Date().toISOString(),
                        remarks: `Production Order #${workOrder.orderNumber}`
                    }).save({ session });
                }

                // 2. Add Finished Good
                const finishedGood = await Product.findById(workOrder.product).session(session);
                if (finishedGood) {
                    finishedGood.stock += workOrder.quantity;
                    await finishedGood.save({ session });

                    // Create Ledger Entry (IN)
                    await new StoreLedger({
                        product: finishedGood._id,
                        type: 'IN',
                        quantity: workOrder.quantity,
                        referenceId: workOrder.id,
                        referenceType: 'Adjustment',
                        date: new Date().toISOString(),
                        remarks: `Production Order #${workOrder.orderNumber} Completed`
                    }).save({ session });
                }
            }

            workOrder.status = status as any;
            await workOrder.save({ session });
            updatedOrder = workOrder;
        });
        
        await session.endSession();
        return updatedOrder;
    }
}
