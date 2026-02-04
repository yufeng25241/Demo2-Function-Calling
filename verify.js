const http = require('http');

const data = JSON.stringify({
    name: "王小明",
    phone: "0999-999-999"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/tools/update-customer',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, res => {
    let responseBody = '';

    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', d => {
        responseBody += d;
    });

    res.on('end', () => {
        console.log('Response:', responseBody);

        // Verify by Fetching
        http.get('http://localhost:3000/api/customers', (res2) => {
            let data2 = '';
            res2.on('data', d => data2 += d);
            res2.on('end', () => {
                const customers = JSON.parse(data2);
                const updated = customers.find(c => c.name === "王小明");
                if (updated && updated.phone === "0999-999-999") {
                    console.log("VERIFICATION SUCCESS: Phone updated correctly.");
                } else {
                    console.log("VERIFICATION FAILED: Phone not updated.", updated);
                }
            });
        });
    });
});

req.on('error', error => {
    console.error('Error:', error);
});

req.write(data);
req.end();
