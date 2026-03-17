import Sale from '../models/Sale';
import Product from '../models/Product';
import mongoose from 'mongoose';

export class AnalyticsService {

    /**
     * Calculate Simple Moving Average (SMA) forecast for a product
     * based on the last 6 months of sales data.
     */
    static async getProductForecast(productId: string) {
        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        // 1. Get Sales Data for last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const sales = await Sale.find({
            'items.product': new mongoose.Types.ObjectId(productId),
            date: { $gte: sixMonthsAgo }
        }).sort({ date: 1 });

        // 2. Group by Month
        const monthlySales: Record<string, number> = {};

        sales.forEach(sale => {
            const date = new Date(sale.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`; // YYYY-M

            const item = sale.items.find(i => i.product.toString() === productId);
            if (item) {
                monthlySales[key] = (monthlySales[key] || 0) + item.quantity;
            }
        });

        // 3. Prepare Data Points for Linear Regression / SMA
        const dataPoints = Object.entries(monthlySales).map(([key, value]) => ({
            month: key,
            quantity: value
        }));

        // Fill in missing months with 0
        // (Simplified logic: taking available points)

        // 4. Calculate Average (Simple Forecast)
        const totalQuantity = dataPoints.reduce((sum, p) => sum + p.quantity, 0);
        const average = dataPoints.length > 0 ? totalQuantity / dataPoints.length : 0;

        // 5. Calculate Linear Trend (y = mx + b)
        // x = month index (0, 1, 2...), y = quantity
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
        const intercept = n > 1 ? (sumY - slope * sumX) / n : (n === 1 ? sumY : 0);

        // Predict next month (index = n)
        const predictedNextMonth = Math.max(0, Math.ceil(slope * n + intercept));

        return {
            productId,
            productName: product.name,
            currentStock: product.stock,
            history: dataPoints,
            averageMonthlySales: Math.round(average),
            predictedNextMonth,
            recommendation: this.generateRecommendation(product.stock, predictedNextMonth)
        };
    }

    static generateRecommendation(currentStock: number, predicted: number): string {
        if (currentStock <= 0) return 'Critical: Out of Stock';
        if (currentStock < predicted) return 'High Priority: Restock Immediately';
        if (currentStock < predicted * 1.5) return 'Medium: Plan Restock Soon';
        return 'Low: Sufficient Stock';
    }
}
