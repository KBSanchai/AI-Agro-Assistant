-- Add s3_url column to predictions table
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS s3_url TEXT;
