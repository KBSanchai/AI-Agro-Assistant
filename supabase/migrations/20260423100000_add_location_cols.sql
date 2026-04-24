-- Add latitude and longitude to predictions table
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS longitude FLOAT;
