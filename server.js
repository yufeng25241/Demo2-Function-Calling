const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Window A: Get all customers
app.get('/api/customers', async (req, res) => {
    try {
        const rows = await db.queryAll();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'File read error' });
    }
});

// Chat with Ollama (Function Calling)
app.post('/api/chat', async (req, res) => {
    const { message, model = process.env.OLLAMA_MODEL || 'gpt-oss:20b' } = req.body;

    try {
        const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

        // Support a mock mode for development when Ollama is not available
        let data;
        if (process.env.MOCK_OLLAMA === 'true') {
            // Simulate a response that calls the update_customer tool
            data = {
                message: {
                    content: 'Mock: I will update the customer phone.',
                    tool_calls: [
                        {
                            name: 'update_customer',
                            arguments: JSON.stringify({ name: '王小明', phone: '0999-999-999' })
                        }
                    ]
                }
            };
        } else {
            const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: message }],
                    stream: false,
                    tools: [
                        {
                            type: 'function',
                            function: {
                                name: 'update_customer',
                                description: 'Update a customer\'s phone number',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string', description: 'The name of the customer' },
                                        phone: { type: 'string', description: 'The new phone number' }
                                    },
                                    required: ['name', 'phone']
                                }
                            }
                        }
                    ]
                })
            });

            data = await ollamaRes.json();
        }

        const responseMessage = data && data.message ? data.message : null;

        if (responseMessage && responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            // Found intent to update
            const toolCall = responseMessage.tool_calls[0];
            return res.json({
                type: 'confirmation_required',
                tool_call: toolCall
            });
        }

        // Normal response or fallback
        res.json({
            type: 'message',
            content: responseMessage ? responseMessage.content : 'No response from Ollama.'
        });

    } catch (err) {
        console.error('Ollama connection error:', err);
        res.status(502).json({ error: 'Failed to connect to AI service' });
    }
});

// Tool: Update customer (Called by Window B's AI logic)
app.post('/api/tools/update-customer', async (req, res) => {
    const { name, phone } = req.body;
    try {
        const updatedCustomer = await db.updateCustomer(name, phone);

        if (!updatedCustomer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ message: `已成功將 ${name} 的電話更新為 ${phone}`, customer: updatedCustomer });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'File write error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
