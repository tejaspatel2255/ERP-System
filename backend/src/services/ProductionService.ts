import { supabase } from '../lib/supabase';

export class ProductionService {
    static async getAllBOMs() {
        const { data, error } = await supabase
            .from('boms')
            .select(`
                *,
                product:product (name, sku)
            `);

        if (error) throw new Error(error.message);

        const boms = [];
        for (const bom of data) {
            const materialsPopulated = [];
            for (const item of bom.materials) {
                const { data: material } = await supabase
                    .from('products')
                    .select('name, sku, unit, price, "unitCost"')
                    .eq('id', item.material)
                    .single();

                materialsPopulated.push({
                    material: material ? { _id: item.material, ...material, unitCost: Number(material.unitCost) } : null,
                    quantity: item.quantity,
                });
            }
            boms.push({
                _id: bom.id,
                product: bom.product,
                name: bom.name,
                description: bom.description,
                materials: materialsPopulated,
            });
        }
        return boms;
    }

    static async createBOM(payload: any) {
        const dbMaterials = payload.materials.map((m: any) => ({
            material: m.material,
            quantity: m.quantity,
        }));

        const { data, error } = await supabase
            .from('boms')
            .insert([
                {
                    product: payload.product,
                    name: payload.name,
                    description: payload.description,
                    materials: dbMaterials,
                },
            ])
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            _id: data.id,
            product: data.product,
            name: data.name,
            description: data.description,
            materials: payload.materials,
        };
    }

    static async getAllWorkOrders() {
        const { data, error } = await supabase
            .from('work_orders')
            .select(`
                *,
                product:product (name, sku),
                bom:bom (name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        return data.map((wo: any) => ({
            _id: wo.id,
            product: wo.product,
            bom: wo.bom,
            quantity: Number(wo.quantity),
            status: wo.status,
            orderNumber: wo.orderNumber,
            startDate: wo.startDate,
            endDate: wo.endDate,
            createdAt: wo.created_at,
        }));
    }

    static async createWorkOrder(payload: any) {
        const { data, error } = await supabase
            .from('work_orders')
            .insert([
                {
                    product: payload.product,
                    bom: payload.bom,
                    quantity: payload.quantity,
                    orderNumber: payload.orderNumber,
                    startDate: payload.startDate,
                    endDate: payload.endDate,
                    status: 'Pending',
                },
            ])
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            _id: data.id,
            product: data.product,
            bom: data.bom,
            quantity: Number(data.quantity),
            status: data.status,
            orderNumber: data.orderNumber,
            startDate: data.startDate,
            endDate: data.endDate,
        };
    }

    static async updateWorkOrderStatus(id: string, status: string) {
        const { data: workOrder, error: woError } = await supabase
            .from('work_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (woError || !workOrder) throw new Error('Work Order not found');

        if (status === 'Completed' && workOrder.status !== 'Completed') {
            const { data: bom, error: bomError } = await supabase
                .from('boms')
                .select('*')
                .eq('id', workOrder.bom)
                .single();

            if (bomError || !bom) throw new Error('BOM not found');

            for (const item of bom.materials) {
                const totalNeeded = Number(item.quantity) * Number(workOrder.quantity);

                const { data: material, error: matError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', item.material)
                    .single();

                if (matError || !material) throw new Error(`Material not found`);

                if (Number(material.stock) < totalNeeded) {
                    throw new Error(`Insufficient stock for material: ${material.name}`);
                }

                const newStock = Number(material.stock) - totalNeeded;
                const { error: updateMatErr } = await supabase
                    .from('products')
                    .update({ stock: newStock })
                    .eq('id', material.id);

                if (updateMatErr) throw new Error(`Failed to update material stock`);

                const { error: ledgerOutErr } = await supabase.from('store_ledger').insert([
                    {
                        product: material.id,
                        type: 'OUT',
                        quantity: totalNeeded,
                        referenceId: workOrder.id,
                        referenceType: 'Adjustment',
                        remarks: `Production Order #${workOrder.orderNumber}`,
                        date: new Date().toISOString(),
                    },
                ]);
                if (ledgerOutErr) console.error('Failed to log material consumption:', ledgerOutErr);
            }

            const { data: finishedGood, error: fgError } = await supabase
                .from('products')
                .select('*')
                .eq('id', workOrder.product)
                .single();

            if (finishedGood) {
                const newStock = Number(finishedGood.stock) + Number(workOrder.quantity);
                const { error: updateFgErr } = await supabase
                    .from('products')
                    .update({ stock: newStock })
                    .eq('id', finishedGood.id);

                if (updateFgErr) throw new Error(`Failed to update finished good stock`);

                const { error: ledgerInErr } = await supabase.from('store_ledger').insert([
                    {
                        product: finishedGood.id,
                        type: 'IN',
                        quantity: Number(workOrder.quantity),
                        referenceId: workOrder.id,
                        referenceType: 'Adjustment',
                        remarks: `Production Order #${workOrder.orderNumber} Completed`,
                        date: new Date().toISOString(),
                    },
                ]);
                if (ledgerInErr) console.error('Failed to log finished good stock addition:', ledgerInErr);
            }
        }

        const { data: updatedWO, error: updateWOError } = await supabase
            .from('work_orders')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (updateWOError) throw new Error(updateWOError.message);

        return {
            _id: updatedWO.id,
            product: updatedWO.product,
            bom: updatedWO.bom,
            quantity: Number(updatedWO.quantity),
            status: updatedWO.status,
            orderNumber: updatedWO.orderNumber,
            startDate: updatedWO.startDate,
            endDate: updatedWO.endDate,
        };
    }
}
