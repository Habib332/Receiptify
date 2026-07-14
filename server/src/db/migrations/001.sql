-- Receiptify — Full Schema
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS throughout.
-- NOTE: if `users` already exists from before Google OAuth was added,
-- IF NOT EXISTS will NOT retroactively add the new columns to it — see
-- the ALTER block at the bottom, which only runs the missing pieces.

CREATE TABLE IF NOT EXISTS businesses (
    business_id     SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(100),
    address         TEXT,
    phone           VARCHAR(20),
    logo_url        TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    user_id         SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT,                          -- nullable: Google-only users have none
    google_id       VARCHAR(255) UNIQUE,            -- Google's stable account id ("sub" claim)
    auth_provider   VARCHAR(20) NOT NULL DEFAULT 'local'
                        CHECK (auth_provider IN ('local', 'google')),
    avatar_url      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS business_users (
    business_id     INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
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

-- Add this block to your existing single schema file (001.sql), after the
-- business_users table definition.

CREATE TABLE IF NOT EXISTS receipts (
    receipt_id      SERIAL PRIMARY KEY,
    business_id     INTEGER NOT NULL,
    uploaded_by     INTEGER NOT NULL,

    vendor_name     VARCHAR(255) NOT NULL,   -- who the receipt is FROM (e.g. "Walmart") — not the business using Receiptify
    amount          NUMERIC(10, 2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'PKR',
    receipt_date    DATE NOT NULL,           -- date on the receipt, not upload date
    notes           TEXT,

    image_url       TEXT,                    -- nullable until a storage provider is chosen (Phase 2)

    ocr_status      VARCHAR(20) NOT NULL DEFAULT 'not_processed'
                        CHECK (ocr_status IN ('not_processed', 'pending', 'completed', 'failed')),
    ocr_raw_text    TEXT,                    -- unused until OCR is implemented

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_receipt_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_receipt_uploader
        FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id)
        ON DELETE RESTRICT  -- don't let a receipt lose its uploader if the user is later deleted
);

ALTER TABLE receipts ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE receipts ALTER COLUMN receipt_date DROP NOT NULL;


CREATE INDEX IF NOT EXISTS idx_receipts_business_id ON receipts(business_id);
CREATE INDEX IF NOT EXISTS idx_receipts_uploaded_by ON receipts(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_date ON receipts(receipt_date);



-- ---------------------------------------------------------------------
-- Receipts extension: payment-verification fields (customer identity,
-- transaction reference, dedup signals, verification workflow).
-- Added after the original receipts table + its indexes already existed.
-- Columns first, THEN constraints, THEN indexes — same ordering rule that
-- caused the earlier idx_users_google_id / 42703 error, being followed
-- deliberately this time.
-- ---------------------------------------------------------------------

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(255);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS screenshot_hash VARCHAR(64);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(5, 2);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS duplicate_status VARCHAR(20) NOT NULL DEFAULT 'none';

-- CHECK constraints added as guarded DO blocks — a plain
-- "ADD CONSTRAINT ... CHECK (...)" would throw "constraint already
-- exists" on a second run of this file, since Postgres has no
-- "ADD CONSTRAINT IF NOT EXISTS". This makes re-running the file safe.
DO $$ BEGIN
    ALTER TABLE receipts ADD CONSTRAINT chk_verification_status
        CHECK (verification_status IN ('pending', 'verified', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE receipts ADD CONSTRAINT chk_duplicate_status
        CHECK (duplicate_status IN ('none', 'flagged', 'confirmed_duplicate', 'not_duplicate'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes LAST, now that every column above is guaranteed to exist.
-- transaction_reference and screenshot_hash are the two dedup lookup
-- keys (PRD 5.6) — both need to be fast since duplicate checks will run
-- on every new receipt upload, not just occasionally.
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_reference ON receipts(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_receipts_screenshot_hash ON receipts(screenshot_hash);
CREATE INDEX IF NOT EXISTS idx_receipts_verification_status ON receipts(verification_status);




CREATE INDEX IF NOT EXISTS idx_business_users_user ON business_users(user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_business ON business_users(business_id);

-- One-time, short-lived codes used to hand an identityToken from the
-- Google OAuth callback (a browser redirect) back to the frontend
-- (which needs it via a JSON response, not a URL). See google.service.js.
CREATE TABLE IF NOT EXISTS oauth_exchange_codes (
    code            TEXT PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    identity_token  TEXT NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at         TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_oauth_exchange_codes_expires_at
    ON oauth_exchange_codes(expires_at);

-- ---------------------------------------------------------------------
-- Backfill block: only matters if `users` already existed in your DB
-- from before these Google columns were added. Harmless / no-op if the
-- table was just created fresh above.
-- ---------------------------------------------------------------------
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Index on google_id must come AFTER the backfill block above, since on
-- a pre-existing `users` table the column doesn't exist until that
-- ALTER TABLE runs. This was the cause of the 42703 migration error.
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Notifications (PRD 5.14) — in-app only for now. business_id scopes
-- visibility (RBAC-relevant roles see it), user_id is nullable since some
-- notifications are business-wide (e.g. "OCR failed on a receipt") rather
-- than aimed at one specific person.
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    business_id      INTEGER NOT NULL,
    user_id          INTEGER,              -- nullable: null = visible to all business members with access
    type             VARCHAR(50) NOT NULL
                         CHECK (type IN ('ocr_failed', 'duplicate_flagged', 'receipt_verified', 'receipt_rejected')),
    title            VARCHAR(255) NOT NULL,
    message          TEXT,
    related_receipt_id INTEGER,            -- nullable: not every notification type will point at a receipt in the future
    is_read          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

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
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE TABLE IF NOT EXISTS business_join_requests (
    request_id      SERIAL PRIMARY KEY,
    business_id     INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    requested_role  VARCHAR(20) NOT NULL CHECK (requested_role IN ('manager', 'staff')),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at     TIMESTAMP WITH TIME ZONE,
    resolved_by     INTEGER,

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
        ON DELETE SET NULL,

    CONSTRAINT unique_pending_request UNIQUE (business_id, user_id, status)
);
alter table business_join_requests DROP CONSTRAINT unique_pending_request;
CREATE UNIQUE INDEX unique_pending_request_per_user
  ON business_join_requests (business_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_join_requests_business_id ON business_join_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON business_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON business_join_requests(status);

-- Add the new notification type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('ocr_failed', 'duplicate_flagged', 'receipt_verified', 'receipt_rejected', 'join_request'));

-- New FK column, same pattern as related_receipt_id
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_join_request_id INTEGER;

DO $$ BEGIN
    ALTER TABLE notifications ADD CONSTRAINT fk_notification_join_request
        FOREIGN KEY (related_join_request_id)
        REFERENCES business_join_requests(request_id)
        ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_related_join_request_id
    ON notifications(related_join_request_id);