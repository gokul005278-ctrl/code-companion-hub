-- Add post-completion tracking fields to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS album_delivered boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS final_payment_received boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_notes text;

-- Create package add-ons table
CREATE TABLE IF NOT EXISTS public.package_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  default_price numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create booking add-ons junction table
CREATE TABLE IF NOT EXISTS public.booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.package_addons(id) ON DELETE CASCADE,
  custom_price numeric,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(booking_id, addon_id)
);

-- Enable RLS on new tables
ALTER TABLE public.package_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;

-- RLS policies for package_addons
CREATE POLICY "Owners can manage own addons" ON public.package_addons
  FOR ALL USING (auth.uid() = owner_id);

-- RLS policies for booking_addons
CREATE POLICY "Owners can manage booking addons" ON public.booking_addons
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.id = booking_addons.booking_id 
    AND bookings.owner_id = auth.uid()
  ));