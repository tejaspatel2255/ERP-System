import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Initialize outside if possible, but we can also instantiate per request if needed for safety against env loading timing
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const SYSTEM_INSTRUCTION = `
You are an intelligent ERP Assistant for "NexusERP".
Your role is to help users manage their business, answer questions about the system, and provide insights.
You have access to the following modules in the system:
- Dashboard (Overview)
- Inventory (Products, Stock)
- Sales (Orders, Customers)
- Purchase (Vendors, Orders)
- Finance (Accounts, Ledger)
- HR (Employees, Payroll)

Keep your answers professional, concise, and helpful.
If asked about specific data (like "what is the total sales?"), explain that you currently only have general knowledge but will be connected to the live database soon.
`;

router.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        console.log('AI Request received:', { messageLength: message?.length, historyLength: history?.length });

        if (!apiKey) {
            console.error('AI Error: GEMINI_API_KEY is missing in process.env');
            return res.status(500).json({ error: 'AI Service not configured (Missing API Key)' });
        }

        // Initialize here to guarantee we have the key
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const chat = model.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        // Send message with system instruction context (simulated by prepending if needed, 
        // or just relying on the persona in the prompt if the API supports system instructions differently)
        // For Gemini Pro, we can just send the user message, maybe prepended with context if it's the first message.

        // A simple approach for now:
        const prompt = `${SYSTEM_INSTRUCTION}\n\nUser: ${message}`;

        console.log('Sending to Gemini...');
        const result = await chat.sendMessage(prompt);
        const response = result.response;
        const text = response.text();
        console.log('Gemini Response received');

        res.json({ response: text });

    } catch (error: any) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate response', details: error.message });
    }
});

export default router;
