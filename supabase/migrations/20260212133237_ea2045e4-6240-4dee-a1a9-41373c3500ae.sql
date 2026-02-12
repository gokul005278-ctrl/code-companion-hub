
-- Add business detail fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS pincode text,
ADD COLUMN IF NOT EXISTS pan_number text,
ADD COLUMN IF NOT EXISTS gstin text,
ADD COLUMN IF NOT EXISTS sac_code text DEFAULT '998397';
