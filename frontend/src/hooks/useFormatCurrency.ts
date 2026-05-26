import { useState, useEffect } from 'react';
import { SettingsService } from '@/services/settingsService';

export const useFormatCurrency = () => {
    const [currency, setCurrency] = useState('USD');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await SettingsService.getAllSettings();
                if (settings.currency) {
                    setCurrency(settings.currency);
                }
            } catch (error) {
                console.error('Failed to fetch currency settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', {
            style: 'currency',
            currency: currency,
        });
    };

    return { currency, formatCurrency, loading };
};
