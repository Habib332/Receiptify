-- ==========================================================
-- Receiptify Database Schema
-- Clean Initial Schema (Migration-Free)
-- ==========================================================

-- ==========================================================
-- BUSINESSES
-- ==========================================================

CREATE TABLE IF NOT EXISTS businesses (
    business_id     SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(100),
    address         TEXT,
    phone           VARCHAR(20),
    logo_url        TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- USERS
-- ==========================================================

CREATE TABLE IF NOT EXISTS users (
    user_id         SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT,
    google_id       VARCHAR(255) UNIQUE,
    auth_provider   VARCHAR(20) NOT NULL DEFAULT 'local'
        CHECK (auth_provider IN ('local', 'google')),
    avatar_url      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- BUSINESS USERS
-- ==========================================================

CREATE TABLE IF NOT EXISTS business_users (
    business_id     INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    role            VARCHAR(20) NOT NULL
        CHECK (role IN ('owner', 'manager', 'staff')),
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

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

-- ==========================================================
-- RECEIPTS
-- ==========================================================

CREATE TABLE IF NOT EXISTS receipts (
    receipt_id              SERIAL PRIMARY KEY,

    business_id             INTEGER NOT NULL,
    uploaded_by             INTEGER NOT NULL,

    amount                  NUMERIC(10,2),
    currency                VARCHAR(3) NOT NULL DEFAULT 'PKR',
    receipt_date            DATE,
    notes                   TEXT,
    image_url               TEXT,

    sender_name             VARCHAR(255),
    sender_bank             VARCHAR(100),

    receiver_name           VARCHAR(255),
    receiver_bank           VARCHAR(100),

    transaction_reference   VARCHAR(255),
    screenshot_hash         VARCHAR(64),

    verification_status     VARCHAR(20) NOT NULL DEFAULT 'pending',
    duplicate_status        VARCHAR(20) NOT NULL DEFAULT 'none',

    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_verification_status
        CHECK (
            verification_status IN (
                'pending',
                'verified',
                'rejected'
            )
        ),

    CONSTRAINT chk_duplicate_status
        CHECK (
            duplicate_status IN (
                'none',
                'flagged',
                'confirmed_duplicate',
                'not_duplicate'
            )
        ),

    CONSTRAINT fk_receipt_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_receipt_uploader
        FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);

-- ==========================================================
-- OAUTH EXCHANGE CODES
-- ==========================================================

CREATE TABLE IF NOT EXISTS oauth_exchange_codes (
    code            TEXT PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    identity_token  TEXT NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at         TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_oauth_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- ==========================================================
-- BUSINESS JOIN REQUESTS
-- ==========================================================

CREATE TABLE IF NOT EXISTS business_join_requests (
    request_id          SERIAL PRIMARY KEY,

    business_id         INTEGER NOT NULL,
    user_id             INTEGER NOT NULL,

    requested_role      VARCHAR(20) NOT NULL
        CHECK (requested_role IN ('manager', 'staff')),

    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at         TIMESTAMP WITH TIME ZONE,
    resolved_by         INTEGER,

    CONSTRAINT fk_join_request_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_join_request_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_join_request_resolved_by
        FOREIGN KEY (resolved_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
-- ==========================================================
-- NOTIFICATIONS
-- ==========================================================

CREATE TABLE IF NOT EXISTS notifications (
    notification_id         SERIAL PRIMARY KEY,

    business_id             INTEGER NOT NULL,
    user_id                 INTEGER,

    type                    VARCHAR(50) NOT NULL
        CHECK (
            type IN (
                'ocr_failed',
                'duplicate_flagged',
                'receipt_verified',
                'receipt_rejected',
                'join_request'
            )
        ),

    title                   VARCHAR(255) NOT NULL,
    message                 TEXT,

    related_receipt_id      INTEGER,
    related_join_request_id INTEGER,

    is_read                 BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_notification_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_receipt
        FOREIGN KEY (related_receipt_id)
        REFERENCES receipts(receipt_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notification_join_request
        FOREIGN KEY (related_join_request_id)
        REFERENCES business_join_requests(request_id)
        ON DELETE CASCADE
);

-- ==========================================================
-- UPLOAD BATCHES
-- ==========================================================

CREATE TABLE IF NOT EXISTS upload_batches (
    batch_id            SERIAL PRIMARY KEY,

    business_id         INTEGER NOT NULL,
    uploaded_by         INTEGER NOT NULL,

    total_files         INTEGER NOT NULL,
    processed_files     INTEGER DEFAULT 0,
    failed_files        INTEGER DEFAULT 0,

    status              VARCHAR(20) NOT NULL DEFAULT 'processing',

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_batch_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_batch_user
        FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id)
);

-- ==========================================================
-- INDEXES
-- ==========================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_google_id
    ON users(google_id);

-- Business Users
CREATE INDEX IF NOT EXISTS idx_business_users_user
    ON business_users(user_id);

CREATE INDEX IF NOT EXISTS idx_business_users_business
    ON business_users(business_id);

-- Receipts
CREATE INDEX IF NOT EXISTS idx_receipts_business_id
    ON receipts(business_id);

CREATE INDEX IF NOT EXISTS idx_receipts_uploaded_by
    ON receipts(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_receipts_receipt_date
    ON receipts(receipt_date);

CREATE INDEX IF NOT EXISTS idx_receipts_transaction_reference
    ON receipts(transaction_reference);

CREATE INDEX IF NOT EXISTS idx_receipts_screenshot_hash
    ON receipts(screenshot_hash);

CREATE INDEX IF NOT EXISTS idx_receipts_verification_status
    ON receipts(verification_status);

-- OAuth Exchange Codes
CREATE INDEX IF NOT EXISTS idx_oauth_exchange_codes_expires_at
    ON oauth_exchange_codes(expires_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_business_id
    ON notifications(business_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read
    ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_related_join_request_id
    ON notifications(related_join_request_id);

-- Business Join Requests
CREATE INDEX IF NOT EXISTS idx_join_requests_business_id
    ON business_join_requests(business_id);

CREATE INDEX IF NOT EXISTS idx_join_requests_user_id
    ON business_join_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_join_requests_status
    ON business_join_requests(status);

-- Only one pending request per user per business
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_request_per_user
    ON business_join_requests (business_id, user_id)
    WHERE status = 'pending';

ALTER TABLE receipts ADD COLUMN upload_status VARCHAR(20) NOT NULL DEFAULT 'draft';
-- 'draft' = created by upload, not yet confirmed by user on Review
-- 'confirmed' = user hit Save