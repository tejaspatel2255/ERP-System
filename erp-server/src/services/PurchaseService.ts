import mongoose from 'mongoose';
import Purchase from '../models/Purchase';
import Product from '../models/Product';
import StoreLedger from '../models/StoreLedger';

export class PurchaseService {
    static async getAllPurchases() {
        return await Purchase.find().sort({ date: -1 });
    }

    static async createPurchase(vendorName: string, items: any[]) {
        let totalAmount = 0;
        const purchaseItems = [];
        let newPurchase: any = null;

        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
            for (const item of items) {
                const product = await Product.findById(item.productId).session(session);
                if (!product) throw new Error(`Product not found: ${item.productId}`);

                const itemTotal = item.cost * item.quantity;
                totalAmount += itemTotal;

                purchaseItems.push({
                    product: product._id,
                    name: product.name,
                    quantity: item.quantity,
                    cost: item.cost,
                    total: itemTotal
                });

                // Increment Stock
                product.stock += item.quantity;
                await product.save({ session });

                // Create Ledger Entry
                await StoreLedger.create([{
                    product: product._id,
                    type: 'IN',
                    quantity: item.quantity,
                    referenceType: 'Purchase', // id updated below
                    remarks: `Purchased from ${vendorName} @ ${item.cost}`
                }], { session });
            }

            // Create Purchase Record
            const created = await Purchase.create([{
                vendorName,
                items: purchaseItems,
                totalAmount,
                date: new Date()
            }], { session });

            newPurchase = created[0];

            // Update ledger referenceIds
            await StoreLedger.updateMany(
                { referenceType: 'Purchase', referenceId: { $exists: false } },
                { $set: { referenceId: newPurchase._id.toString() } },
                { session }
            );
        });
        await session.endSession();

        return newPurchase;
    }
}
