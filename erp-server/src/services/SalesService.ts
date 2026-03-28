import mongoose from 'mongoose';
import Sale from '../models/Sale';
import Product from '../models/Product';
import Customer from '../models/Customer';
import StoreLedger from '../models/StoreLedger';
import Alert from '../models/Alert';

export class SalesService {
    static async getAllSales() {
        return await Sale.find().populate('customer', 'name email').sort({ date: -1 });
    }

    static async createSale(customerId: string, items: any[], status: string, io: any) {
        const customer = await Customer.findById(customerId);
        if (!customer) throw new Error('Customer not found');

        let totalAmount = 0;
        const saleItems = [];
        const alerts: any[] = [];
        let newSale: any = null;

        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
            for (const item of items) {
                const product = await Product.findById(item.productId).session(session);
                if (!product) throw new Error(`Product not found: ${item.productId}`);

                if (product.stock < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.name}`);
                }

                const itemTotal = product.price * item.quantity;
                totalAmount += itemTotal;

                saleItems.push({
                    product: product._id,
                    name: product.name,
                    quantity: item.quantity,
                    price: product.price,
                    total: itemTotal
                });

                // Deduct stock if Completed
                if (status === 'Completed' || !status) {
                    product.stock -= item.quantity;
                    await product.save({ session });

                    // Create Ledger
                    await StoreLedger.create([{
                        product: product._id,
                        type: 'OUT',
                        quantity: item.quantity,
                        referenceType: 'Sale', // Will be updated below with newSale _id
                        remarks: `Sold to ${customer.name}`
                    }], { session });

                    if (product.stock <= product.minLevel) {
                        const alertMsg = `Low Stock Warning: ${product.name} is down to ${product.stock} ${product.unit}`;
                        const existingAlert = await Alert.findOne({
                            type: 'LOW_STOCK',
                            message: { $regex: product.name },
                            isRead: false
                        }).session(session);

                        if (!existingAlert) {
                            const newAlert = await Alert.create([{ message: alertMsg, type: 'LOW_STOCK' }], { session });
                            alerts.push(newAlert[0]);
                        }
                    }
                }
            }

            // Create Sale
            const createdSales = await Sale.create([{
                customer: customer._id,
                customerName: customer.name,
                items: saleItems,
                totalAmount,
                status: status || 'Completed',
                date: new Date()
            }], { session });

            newSale = createdSales[0];

            // Update ledger referenceIds
            if (status === 'Completed' || !status) {
                 await StoreLedger.updateMany(
                     { referenceType: 'Sale', referenceId: { $exists: false } },
                     { $set: { referenceId: newSale._id.toString() } },
                     { session }
                 );
            }
        });
        await session.endSession();

        // Emit events outside transaction
        alerts.forEach(alert => {
            if (io) io.emit('notification', alert);
        });

        if (io) {
            io.emit('new_order', {
                message: `New Order #${newSale._id.toString().slice(-6)} from ${customer.name}`,
                sale: newSale
            });
        }

        return newSale;
    }
}
