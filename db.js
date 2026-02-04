const fs = require('fs').promises;
const path = require('path');
const DATA_PATH = path.join(__dirname, 'data.json');

module.exports = {
    async queryAll() {
        const data = await fs.readFile(DATA_PATH, 'utf8');
        return JSON.parse(data);
    },
    async updateCustomer(name, phone) {
        const data = await this.queryAll();
        const index = data.findIndex(c => c.name === name);

        if (index === -1) return null;

        data[index].phone = phone;
        data[index].updated_at = new Date().toISOString();

        await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 4), 'utf8');
        return data[index];
    }
};
