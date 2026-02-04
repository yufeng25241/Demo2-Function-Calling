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
    const { message, model = 'llama3.2' } = req.body;

    try {
        const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
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

        const data = await ollamaRes.json();
        const responseMessage = data.message;

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            // Found intent to update
            const toolCall = responseMessage.tool_calls[0];
            return res.json({
                type: 'confirmation_required',
                tool_call: toolCall
            });
        }

        // Normal response
        res.json({
            type: 'message',
            content: responseMessage.content
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
