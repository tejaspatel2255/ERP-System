'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { ForecastData } from '@/services/analyticsService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ForecastChartProps {
    data: ForecastData;
}

export default function ForecastChart({ data }: ForecastChartProps) {
    const historicalMonths = data.history.map((h) => h.month);
    const historicalQuantities = data.history.map((h) => h.quantity);

    // Add Prediction Point
    const labels = [...historicalMonths, 'Next Month (Predicted)'];

    // Connect historical line to predicted point
    // We add nulls for historical data in the prediction dataset,
    // and the last historical point + predicted point for continuity.
    const lastHistorical = historicalQuantities[historicalQuantities.length - 1] || 0;

    const historicalDataset = [...historicalQuantities, null]; // End of history
    const predictedDataset = Array(historicalMonths.length - 1).fill(null); // Blanks
    predictedDataset.push(lastHistorical); // Connect
    predictedDataset.push(data.predictedNextMonth); // Predict

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Historical Sales',
                data: historicalDataset,
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                tension: 0.3,
            },
            {
                label: 'Forecast',
                data: predictedDataset,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderDash: [5, 5],
                tension: 0.3,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: `Demand Forecast: ${data.productName}`,
            },
        },
    };

    return (
        <div
            style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
            }}
        >
            <Line options={options} data={chartData} />
            <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
                <div>
                    <span style={{ color: 'var(--text-muted)' }}>Avg Monthly Sales:</span>
                    <strong style={{ marginLeft: '0.5rem' }}>{data.averageMonthlySales}</strong>
                </div>
                <div>
                    <span style={{ color: 'var(--text-muted)' }}>Predicted Next Month:</span>
                    <strong style={{ marginLeft: '0.5rem' }}>{data.predictedNextMonth}</strong>
                </div>
                <div>
                    <span style={{ color: 'var(--text-muted)' }}>Rec:</span>
                    <strong
                        style={{
                            marginLeft: '0.5rem',
                            color: data.recommendation.includes('Critical') ? 'red' : 'green',
                        }}
                    >
                        {data.recommendation}
                    </strong>
                </div>
            </div>
        </div>
    );
}
