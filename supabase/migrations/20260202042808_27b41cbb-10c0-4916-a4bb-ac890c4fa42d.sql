-- Create storage bucket for media files with strong RLS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
);

-- RLS policies for media bucket - Only authenticated owners can access their files
CREATE POLICY "Owners can upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can view their own media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can update their own media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can delete their own media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow temporary access holders to view files from their assigned folder
CREATE POLICY "Temp access can view storage files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM public.temporary_access ta
    JOIN public.media_folders mf ON mf.id = ta.folder_id
    WHERE ta.is_active = true
    AND ta.expires_at > now()
    AND mf.storage_path IS NOT NULL
    AND name LIKE mf.storage_path || '%'
  )
);

-- Drop existing policy first if exists, then add new ones
DROP POLICY IF EXISTS "Owners can manage own files" ON public.media_files;

-- Add RLS policy for media_files to allow temp access holders to view files
CREATE POLICY "Owners and temp access can view files"
ON public.media_files FOR SELECT
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM public.temporary_access ta
    WHERE ta.folder_id = media_files.folder_id
    AND ta.is_active = true
    AND ta.expires_at > now()
  )
);

-- Owner can insert files
CREATE POLICY "Owners can insert files"
ON public.media_files FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Owner can update files
CREATE POLICY "Owners can update files"
ON public.media_files FOR UPDATE
USING (auth.uid() = owner_id);

-- Temp access can update selection on files
CREATE POLICY "Temp access can update selection"
ON public.media_files FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.temporary_access ta
    WHERE ta.folder_id = media_files.folder_id
    AND ta.is_active = true
    AND ta.expires_at > now()
  )
);

-- Owner can delete files
CREATE POLICY "Owners can delete files"
ON public.media_files FOR DELETE
USING (auth.uid() = owner_id);

-- Drop existing folder policy and add new one
DROP POLICY IF EXISTS "Owners can manage own folders" ON public.media_folders;

-- Add policy for media folders - owner access
CREATE POLICY "Owners can manage folders"
ON public.media_folders FOR ALL
USING (auth.uid() = owner_id);

-- Add policy for media folders access via temp access
CREATE POLICY "Temp access can view folders"
ON public.media_folders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.temporary_access ta
    WHERE ta.folder_id = media_folders.id
    AND ta.is_active = true
    AND ta.expires_at > now()
  )
);