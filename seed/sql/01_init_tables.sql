CREATE TABLE IF NOT EXISTS motorcycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    availability ENUM('available','reserved','sold') NOT NULL DEFAULT 'available',
    location VARCHAR(120) NOT NULL,
    media JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(160) NOT NULL,
    phone VARCHAR(60) NOT NULL,
    email VARCHAR(160) NULL,
    channel ENUM('whatsapp','telegram','website','manual') NOT NULL DEFAULT 'website',
    status ENUM('new','engaged','hot','won','lost') NOT NULL DEFAULT 'new',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    source ENUM('whatsapp','telegram','webhook') NOT NULL,
    direction ENUM('inbound','outbound') NOT NULL,
    message TEXT NOT NULL,
    ai_confidence DECIMAL(5,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    motorcycle_id INT NULL,
    stage ENUM('research','negotiation','invoice','won','lost') NOT NULL DEFAULT 'research',
    amount DECIMAL(12,2) NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    expected_close DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (motorcycle_id) REFERENCES motorcycles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    remind_at DATETIME NOT NULL,
    channel ENUM('whatsapp','telegram','email') NOT NULL,
    payload JSON NULL,
    sent TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);
