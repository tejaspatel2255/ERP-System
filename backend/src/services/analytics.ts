import { supabase } from '../lib/supabase';

export class AnalyticsService {
    /**
     * Calculate Simple Moving Average (SMA) forecast for a product
     * based on the last 6 months of sales data.
     */
    static async getProductForecast(productId: string) {
        const { data: product, error: productErr } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (productErr || !product) throw new Error('Product not found');

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: sales, error: salesErr } = await supabase
            .from('sales')
            .select('*')
            .gte('date', sixMonthsAgo.toISOString());

        if (salesErr || !sales) throw new Error(salesErr?.message || 'Failed to fetch sales for analytics');

        const monthlySales: Record<string, number> = {};

        sales.forEach((sale: any) => {
            const date = new Date(sale.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

            const item = sale.items.find((i: any) => i.productId === productId);
            if (item) {
                monthlySales[key] = (monthlySales[key] || 0) + Number(item.quantity);
            }
        });

        const dataPoints = Object.entries(monthlySales).map(([key, value]) => ({
            month: key,
            quantity: value,
        }));

        const totalQuantity = dataPoints.reduce((sum, p) => sum + p.quantity, 0);
        const average = dataPoints.length > 0 ? totalQuantity / dataPoints.length : 0;

        let n = dataPoints.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        dataPoints.forEach((point, index) => {
            sumX += index;
            sumY += point.quantity;
            sumXY += index * point.quantity;
            sumXX += index * index;
        });

        const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
        const intercept = n > 1 ? (sumY - slope * sumX) / n : n === 1 ? sumY : 0;

        const predictedNextMonth = Math.max(0, Math.ceil(slope * n + intercept));

        return {
            productId,
            productName: product.name,
            currentStock: Number(product.stock),
            history: dataPoints,
            averageMonthlySales: Math.round(average),
            predictedNextMonth,
            recommendation: this.generateRecommendation(Number(product.stock), predictedNextMonth),
        };
    }

    static generateRecommendation(currentStock: number, predicted: number): string {
        if (currentStock <= 0) return 'Critical: Out of Stock';
        if (currentStock < predicted) return 'High Priority: Restock Immediately';
        if (currentStock < predicted * 1.5) return 'Medium: Plan Restock Soon';
        return 'Low: Sufficient Stock';
    }
}
