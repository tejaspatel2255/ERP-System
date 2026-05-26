import api from '@/lib/api';

export interface ForecastData {
    productId: string;
    productName: string;
    currentStock: number;
    history: { month: string; quantity: number }[];
    averageMonthlySales: number;
    predictedNextMonth: number;
    recommendation: string;
}

export const AnalyticsService = {
    getForecast: async (productId: string): Promise<ForecastData> => {
        const response = await api.get(`/analytics/forecast/${productId}`);
        return response.data;
    },

    getRestockRecommendations: async (): Promise<ForecastData[]> => {
        const response = await api.get(`/analytics/restock-recommendations`);
        return response.data;
    },
};
