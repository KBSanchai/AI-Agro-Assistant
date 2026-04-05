
-- Create predictions table
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('fertilizer', 'insect')),
  prediction TEXT NOT NULL,
  cure TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own predictions"
  ON public.predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions"
  ON public.predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own predictions"
  ON public.predictions FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for crop images
INSERT INTO storage.buckets (id, name, public) VALUES ('crop-images', 'crop-images', true);

CREATE POLICY "Users can upload crop images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'crop-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view crop images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crop-images');

CREATE POLICY "Users can delete own crop images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'crop-images' AND auth.uid()::text = (storage.foldername(name))[1]);
