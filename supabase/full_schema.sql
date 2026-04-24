-- Consolidated Schema for Supabase Migration
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/avjpdkizgfhwaknbidja/sql)

-- 1. Create the plants table
CREATE TABLE IF NOT EXISTS public.plants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('fertilizer', 'insect')),
  prediction TEXT NOT NULL,
  cure TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  s3_url TEXT,
  temperature FLOAT,
  humidity INTEGER,
  plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL
);

-- 3. Enable RLS
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- 4. Policies for plants
DO $$ BEGIN
  CREATE POLICY "Users can view own plants" ON public.plants FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own plants" ON public.plants FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. Policies for predictions
DO $$ BEGIN
  CREATE POLICY "Users can view own predictions" ON public.predictions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own predictions" ON public.predictions FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. Create storage bucket for crop images
-- Note: Run this separately if the bucket doesn't exist, or use the Dashboard UI
-- INSERT INTO storage.buckets (id, name, public) VALUES ('crop-images', 'crop-images', true);

-- 7. Storage Policies
-- Make sure the bucket 'crop-images' is created first.
-- Policy: Users can upload crop images
DO $$ BEGIN
  CREATE POLICY "Users can upload crop images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'crop-images' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Policy: Anyone can view crop images
DO $$ BEGIN
  CREATE POLICY "Anyone can view crop images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'crop-images');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Policy: Users can delete own crop images
DO $$ BEGIN
  CREATE POLICY "Users can delete own crop images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'crop-images' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN null; END $$;
