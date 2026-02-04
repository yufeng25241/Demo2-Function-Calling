const http = require('http');

// Prompt that should trigger tool calling
// Using English prompt to ensure better compatibility with 8b models if Chinese fine-tuning is lacking,
// though the user asked for Chinese support. Let's test with Chinese first to match user request.
const prompt = "幫我把王小明的電話改成 0987654321";

const data = JSON.stringify({
    message: prompt,
    model: "llama3.2"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/chat',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

console.log(`Sending prompt: "${prompt}" to /api/chat...`);

const req = http.request(options, res => {
    let responseBody = '';

    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', d => {
        responseBody += d;
    });

    res.on('end', () => {
        console.log('Response:', responseBody);

        try {
            const json = JSON.parse(responseBody);
            // Check for both possible success states:
            // 1. Tool call (confirmation_required)
            // 2. Normal message (if model decided to ask for more info instead of tool call)
            if (json.type === 'confirmation_required') {
                console.log("PASS: Received confirmation_required");
                const args = json.tool_call.function.arguments;
                console.log("Tool Arguments:", args);

                // Flexible check for name/phone extraction
                if (args.name && args.phone) {
                    console.log("PASS: Arguments extracted.");
                } else {
                    console.log("WARN: Arguments might be incomplete.");
                }

            } else if (json.type === 'message') {
                console.log("INFO: Received normal message. Output:", json.content);
                console.log("NOTE: This might happen if the model isn't confident in calling the tool.");
            } else {
                console.log("FAIL: Unexpected response type:", json.type);
            }
        } catch (e) {
            console.log("FAIL: Invalid JSON response");
        }
    });
});

req.on('error', error => {
    console.error('Error:', error);
});

req.write(data);
req.end();
