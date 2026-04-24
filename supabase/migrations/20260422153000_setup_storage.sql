-- Create the storage bucket for crop images
insert into storage.buckets (id, name, public)
values ('crop-images', 'crop-images', true)
on conflict (id) do nothing;

-- Allow public access to images in the crop-images bucket
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'crop-images' );

-- Allow authenticated users to upload images to the crop-images bucket
create policy "Authenticated users can upload images"
on storage.objects for insert
with check (
  bucket_id = 'crop-images' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own images
create policy "Users can delete their own images"
on storage.objects for delete
using (
  bucket_id = 'crop-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
