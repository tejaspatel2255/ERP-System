import { supabase } from '../lib/supabase';

export class PurchaseService {
    static async getAllPurchases() {
        const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw new Error(error.message);

        return data.map((purchase: any) => ({
            _id: purchase.id,
            vendorName: purchase.vendorName,
            items: purchase.items,
            totalAmount: Number(purchase.totalAmount),
            date: purchase.date,
        }));
    }

    static async createPurchase(vendorName: string, items: any[]) {
        let totalAmount = 0;
        const purchaseItems = [];
        const ledgerEntries: any[] = [];

        for (const item of items) {
            const { data: product, error: productErr } = await supabase
                .from('products')
                .select('*')
                .eq('id', item.productId)
                .single();
            if (productErr || !product) throw new Error(`Product not found: ${item.productId}`);

            const itemTotal = item.cost * item.quantity;
            totalAmount += itemTotal;

            purchaseItems.push({
                productId: product.id,
                name: product.name,
                quantity: item.quantity,
                cost: item.cost,
                total: itemTotal,
            });

            const newStock = Number(product.stock) + item.quantity;
            const { error: updateErr } = await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', product.id);
            if (updateErr) throw new Error(`Failed to update stock for ${product.name}`);

            ledgerEntries.push({
                product: product.id,
                type: 'IN',
                quantity: item.quantity,
                referenceType: 'Purchase',
                remarks: `Purchased from ${vendorName} @ ${item.cost}`,
            });
        }

        const { data: newPurchase, error: purchaseErr } = await supabase
            .from('purchases')
            .insert([
                {
                    vendorName: vendorName,
                    items: purchaseItems,
                    totalAmount: totalAmount,
                    date: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (purchaseErr || !newPurchase) throw new Error(`Failed to create purchase: ${purchaseErr?.message}`);

        if (ledgerEntries.length > 0) {
            const entriesWithRef = ledgerEntries.map(entry => ({
                ...entry,
                referenceId: newPurchase.id,
                date: new Date().toISOString(),
            }));
            const { error: ledgerErr } = await supabase.from('store_ledger').insert(entriesWithRef);
            if (ledgerErr) console.error('Failed to create store ledger logs:', ledgerErr);
        }

        return {
            _id: newPurchase.id,
            vendorName: newPurchase.vendorName,
            items: items,
            totalAmount: Number(newPurchase.totalAmount),
            date: newPurchase.date,
        };
    }
}
