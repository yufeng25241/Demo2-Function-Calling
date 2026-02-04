CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO customers (name, phone, email) VALUES
('王小明', '0912-345-678', 'xiaoming@example.com'),
('李美玲', '0922-111-222', 'meiling@example.com'),
('張三', '0933-444-555', 'zhangsan@example.com');
