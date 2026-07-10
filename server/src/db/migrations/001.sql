CREATE TABLE IF NOT EXISTS businesses (
    business_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE TABLE IF NOT EXISTS business_users (
    business_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (business_id, user_id),

    CONSTRAINT fk_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_users_user
ON business_users(user_id);

CREATE INDEX IF NOT EXISTS idx_business_users_business
ON business_users(business_id);