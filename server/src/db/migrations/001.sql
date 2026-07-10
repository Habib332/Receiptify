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