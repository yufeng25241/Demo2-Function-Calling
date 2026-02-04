const customerList = document.getElementById('customer-list');
const refreshBtn = document.getElementById('refresh-btn');
const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');
const chatHistory = document.getElementById('chat-history');

// Window A: Fetch data
async function fetchCustomers() {
    try {
        const res = await fetch('/api/customers');
        const data = await res.json();
        renderTable(data);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

function renderTable(data) {
    customerList.innerHTML = data.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>${c.phone}</td>
            <td>${new Date(c.updated_at).toLocaleTimeString()}</td>
        </tr>
    `).join('');
}

// Window B: Chat & AI Logic
async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    userInput.value = '';

    // Call Backend API
    try {
        addMessage('ai', 'Thinking...');

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        const data = await res.json();

        // Remove "Thinking..." message (last child)
        chatHistory.removeChild(chatHistory.lastElementChild);

        if (data.type === 'confirmation_required') {
            const args = data.tool_call.function.arguments; // { name: "...", phone: "..." }

            // Create Confirmation UI
            const div = document.createElement('div');
            div.classList.add('message', 'ai', 'confirmation-box');
            div.innerHTML = `
                <p>⚠️ <strong>確認修改？</strong></p>
                <p>將 <strong>${args.name}</strong> 的電話改為：<strong>${args.phone}</strong></p>
                <div class="actions">
                    <button class="btn-confirm" onclick="confirmUpdate('${args.name}', '${args.phone}', this)">✅ 確認</button>
                    <button class="btn-cancel" onclick="cancelUpdate(this)">❌ 取消</button>
                </div>
            `;
            chatHistory.appendChild(div);

        } else if (data.type === 'message') {
            addMessage('ai', data.content);
        } else {
            addMessage('ai', 'Error: Unknown response type');
        }

        chatHistory.scrollTop = chatHistory.scrollHeight;

    } catch (err) {
        console.error(err);
        addMessage('ai', '❌ Connection error.');
    }
}

async function confirmUpdate(name, phone, btn) {
    // Disable buttons
    const parent = btn.parentElement;
    parent.innerHTML = '<em>Processing...</em>';

    try {
        const res = await fetch('/api/tools/update-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone })
        });

        const result = await res.json();

        if (res.ok) {
            addMessage('ai', `✅ ${result.message}`);
            window.dispatchEvent(new CustomEvent('data-updated'));
        } else {
            addMessage('ai', `❌ 錯誤：${result.error}`);
        }
    } catch (err) {
        addMessage('ai', '❌ 無法連接到伺服器執行工具。');
    }
}

function cancelUpdate(btn) {
    const parent = btn.parentElement;
    parent.innerHTML = '<em>已取消操作</em>';
}

function addMessage(role, text) {
    const div = document.createElement('div');
    div.classList.add('message', role);
    div.innerHTML = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Event Listeners
refreshBtn.addEventListener('click', fetchCustomers);
sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// Window A listens for Event
window.addEventListener('data-updated', () => {
    console.log('偵測到資料更新事件，重新整理資料...');
    fetchCustomers();
});

// Initial Load
fetchCustomers();
