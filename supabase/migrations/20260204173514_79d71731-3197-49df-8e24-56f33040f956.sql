-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  vendor TEXT,
  receipt_url TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expenses
CREATE POLICY "Owners can manage own expenses"
ON public.expenses FOR ALL
USING (auth.uid() = owner_id);

-- Create trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  event_type TEXT,
  event_date DATE,
  budget TEXT,
  location TEXT,
  message TEXT,
  source TEXT DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT DEFAULT 'medium',
  follow_up_date DATE,
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  notes TEXT,
  converted_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for leads
CREATE POLICY "Owners can manage own leads"
ON public.leads FOR ALL
USING (auth.uid() = owner_id);

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create booking_tasks table for pre-shoots, album processing etc
CREATE TABLE public.booking_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on booking_tasks
ALTER TABLE public.booking_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for booking_tasks
CREATE POLICY "Owners can manage booking tasks"
ON public.booking_tasks FOR ALL
USING (auth.uid() = owner_id);

-- Create trigger for updated_at
CREATE TRIGGER update_booking_tasks_updated_at
BEFORE UPDATE ON public.booking_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add more fields to packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS highlights TEXT[];
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS inclusions TEXT[];
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS exclusions TEXT[];
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 30;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pre_wedding_included BOOLEAN DEFAULT false;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS candid_included BOOLEAN DEFAULT true;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS traditional_included BOOLEAN DEFAULT true;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS album_pages INTEGER DEFAULT 0;

-- Create lead_embed_settings table for widget configuration
CREATE TABLE public.lead_embed_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL UNIQUE,
  embed_token TEXT NOT NULL UNIQUE,
  form_fields JSONB DEFAULT '["name", "phone", "email", "event_type", "message"]'::jsonb,
  theme_color TEXT DEFAULT '#0066FF',
  button_text TEXT DEFAULT 'Get Quote',
  success_message TEXT DEFAULT 'Thank you! We will contact you soon.',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lead_embed_settings
ALTER TABLE public.lead_embed_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead_embed_settings
CREATE POLICY "Owners can manage own embed settings"
ON public.lead_embed_settings FOR ALL
USING (auth.uid() = owner_id);

-- Create public policy for anonymous lead submission
CREATE POLICY "Anyone can insert leads via embed"
ON public.leads FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_lead_embed_settings_updated_at
BEFORE UPDATE ON public.lead_embed_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();