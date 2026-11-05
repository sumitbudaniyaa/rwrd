-- TipTable Initial PostgreSQL Setup
-- Automatically executed on container initialization

-- Enable essential cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE tiptable_dev TO postgres;

