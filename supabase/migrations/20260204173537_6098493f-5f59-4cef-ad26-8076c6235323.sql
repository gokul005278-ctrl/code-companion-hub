-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can insert leads via embed" ON public.leads;

-- Create a more secure policy that requires owner_id to be set
-- The embed endpoint will be an edge function that validates the embed token
-- and inserts the lead with the correct owner_id using service role