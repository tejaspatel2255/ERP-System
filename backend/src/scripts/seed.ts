import 'dotenv/config';
import { supabase } from '../lib/supabase';

const PRODUCTS = [
    {
        name: 'Steel Rod 10mm',
        sku: 'RM-STL-001',
        category: 'Raw Material',
        price: 450,
        stock: 500,
        minLevel: 100,
        unit: 'kg',
    },
    {
        name: 'Copper Wire 2mm',
        sku: 'RM-CPR-002',
        category: 'Raw Material',
        price: 1200,
        stock: 200,
        minLevel: 50,
        unit: 'kg',
    },
    {
        name: 'Circuit Board Motherboard',
        sku: 'EL-MB-101',
        category: 'Electronics',
        price: 8500,
        stock: 45,
        minLevel: 10,
        unit: 'pcs',
    },
    {
        name: 'LCD Screen 15"',
        sku: 'EL-LCD-102',
        category: 'Electronics',
        price: 4200,
        stock: 30,
        minLevel: 15,
        unit: 'pcs',
    },
    {
        name: 'Packaging Box (Large)',
        sku: 'PK-BOX-001',
        category: 'Packaging',
        price: 25,
        stock: 1000,
        minLevel: 500,
        unit: 'pcs',
    },
    {
        name: 'Industrial Lubricant',
        sku: 'CH-LUB-001',
        category: 'Consumables',
        price: 350,
        stock: 50,
        minLevel: 20,
        unit: 'liters',
    },
    { name: 'Bolt M12', sku: 'HD-BLT-012', category: 'Hardware', price: 15, stock: 2500, minLevel: 1000, unit: 'pcs' },
];

const CUSTOMERS = [
    'Apex Industries',
    'TechSolve Solutions',
    'BuildRight Construction',
    'Walk-in Customer',
    'Global Traders',
];
const VENDORS = ['MetalCorp', 'Electro Supplies Ltd', 'PackItUp', 'ChemWorks'];

const randomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const seed = async () => {
    try {
        console.log('✅ Connecting to Supabase...');

        // 1. Delete Existing Records
        await supabase.from('store_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('🧹 Cleared existing data');

        // 2. Insert Products
        const { data: createdProducts, error: prodErr } = await supabase
            .from('products')
            .insert(PRODUCTS)
            .select();

        if (prodErr || !createdProducts) throw prodErr || new Error('Failed to insert products');
        console.log(`📦 Inserted ${createdProducts.length} products`);

        // 3. Generate Sales
        const sales = [];
        for (let i = 0; i < 50; i++) {
            const numItems = Math.floor(Math.random() * 3) + 1;
            const items = [];
            let totalAmount = 0;

            for (let j = 0; j < numItems; j++) {
                const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
                const quantity = Math.floor(Math.random() * 10) + 1;
                const total = Number(product.price) * quantity;
                items.push({
                    productId: product.id,
                    name: product.name,
                    quantity,
                    price: Number(product.price),
                    total,
                });
                totalAmount += total;
            }

            sales.push({
                customerName: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
                items,
                totalAmount,
                date: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()).toISOString(),
            });
        }
        const { error: salesErr } = await supabase.from('sales').insert(sales);
        if (salesErr) throw salesErr;
        console.log(`💰 Generated ${sales.length} sales records`);

        // 4. Generate Purchases
        const purchases = [];
        for (let i = 0; i < 30; i++) {
            const numItems = Math.floor(Math.random() * 5) + 1;
            const items = [];
            let totalAmount = 0;

            for (let j = 0; j < numItems; j++) {
                const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
                const quantity = Math.floor(Math.random() * 50) + 10;
                const cost = Math.floor(Number(product.price) * 0.7); // 30% margin
                const total = cost * quantity;
                items.push({
                    productId: product.id,
                    name: product.name,
                    quantity,
                    cost,
                    total,
                });
                totalAmount += total;
            }

            purchases.push({
                vendorName: VENDORS[Math.floor(Math.random() * VENDORS.length)],
                items,
                totalAmount,
                date: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()).toISOString(),
            });
        }
        const { error: purchasesErr } = await supabase.from('purchases').insert(purchases);
        if (purchasesErr) throw purchasesErr;
        console.log(`🚚 Generated ${purchases.length} purchase records`);

        console.log('🎉 Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seed();
