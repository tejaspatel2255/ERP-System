import { supabase } from '../lib/supabase';

export class SalesService {
    static async getAllSales() {
        const { data, error } = await supabase
            .from('sales')
            .select(`
                *,
                customer:customer (name, email)
            `)
            .order('date', { ascending: false });

        if (error) throw new Error(error.message);

        return data.map((sale: any) => ({
            _id: sale.id,
            customer: sale.customer,
            customerName: sale.customerName,
            items: sale.items,
            totalAmount: Number(sale.totalAmount),
            status: sale.status,
            date: sale.date,
        }));
    }

    static async createSale(customerId: string, items: any[], status: string, io: any) {
        const { data: customer, error: customerErr } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();
        if (customerErr || !customer) throw new Error('Customer not found');

        let totalAmount = 0;
        const saleItems = [];
        const alerts: any[] = [];
        const ledgerEntries: any[] = [];

        for (const item of items) {
            const { data: product, error: productErr } = await supabase
                .from('products')
                .select('*')
                .eq('id', item.productId)
                .single();
            if (productErr || !product) throw new Error(`Product not found: ${item.productId}`);

            if (product.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}`);
            }

            const itemTotal = Number(product.price) * item.quantity;
            totalAmount += itemTotal;

            saleItems.push({
                productId: product.id,
                name: product.name,
                quantity: item.quantity,
                price: Number(product.price),
                total: itemTotal,
            });

            if (status === 'Completed' || !status) {
                const newStock = Number(product.stock) - item.quantity;
                const { error: updateErr } = await supabase
                    .from('products')
                    .update({ stock: newStock })
                    .eq('id', product.id);
                if (updateErr) throw new Error(`Failed to update stock for ${product.name}`);

                ledgerEntries.push({
                    product: product.id,
                    type: 'OUT',
                    quantity: item.quantity,
                    referenceType: 'Sale',
                    remarks: `Sold to ${customer.name}`,
                });

                if (newStock <= Number(product.minLevel)) {
                    const alertMsg = `Low Stock Warning: ${product.name} is down to ${newStock} ${product.unit}`;
                    const { data: existingAlert } = await supabase
                        .from('alerts')
                        .select('*')
                        .eq('type', 'LOW_STOCK')
                        .like('message', `%${product.name}%`)
                        .eq('isRead', false)
                        .maybeSingle();

                    if (!existingAlert) {
                        const { data: newAlert, error: alertErr } = await supabase
                            .from('alerts')
                            .insert([{ message: alertMsg, type: 'LOW_STOCK', isRead: false }])
                            .select()
                            .single();
                        if (!alertErr && newAlert) {
                            alerts.push(newAlert);
                        }
                    }
                }
            }
        }

        const { data: newSale, error: saleErr } = await supabase
            .from('sales')
            .insert([
                {
                    customer: customer.id,
                    customerName: customer.name,
                    items: saleItems,
                    totalAmount: totalAmount,
                    status: status || 'Completed',
                    date: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (saleErr || !newSale) throw new Error(`Failed to create sale: ${saleErr?.message}`);

        if ((status === 'Completed' || !status) && ledgerEntries.length > 0) {
            const entriesWithRef = ledgerEntries.map(entry => ({
                ...entry,
                referenceId: newSale.id,
                date: new Date().toISOString(),
            }));
            const { error: ledgerErr } = await supabase.from('store_ledger').insert(entriesWithRef);
            if (ledgerErr) console.error('Failed to create store ledger logs:', ledgerErr);
        }

        alerts.forEach((alert) => {
            if (io) io.emit('notification', alert);
        });

        if (io) {
            io.emit('new_order', {
                message: `New Order #${newSale.id.slice(-6)} from ${customer.name}`,
                sale: {
                    _id: newSale.id,
                    customer: newSale.customer,
                    customerName: newSale.customerName,
                    items: items,
                    totalAmount: Number(newSale.totalAmount),
                    status: newSale.status,
                    date: newSale.date,
                },
            });
        }

        return {
            _id: newSale.id,
            customer: newSale.customer,
            customerName: newSale.customerName,
            items: items,
            totalAmount: Number(newSale.totalAmount),
            status: newSale.status,
            date: newSale.date,
        };
    }
}
