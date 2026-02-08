DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('CHANNEL_OWNER', 'ADVERTISER', 'BOTH');
    END IF;
END
$$;
