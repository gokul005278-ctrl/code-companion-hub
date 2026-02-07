-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'temporary_client');

-- Create event type enum
CREATE TYPE public.event_type AS ENUM ('wedding', 'engagement', 'birthday', 'corporate', 'reel', 'drone', 'other');

-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM ('inquiry', 'confirmed', 'advance_paid', 'shoot_completed', 'delivered');

-- Create team member type enum
CREATE TYPE public.team_member_type AS ENUM ('photographer', 'videographer', 'editor', 'drone_operator', 'other');

-- Create employment type enum
CREATE TYPE public.employment_type AS ENUM ('in_house', 'freelance');

-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'paid');

-- User roles table (security requirement)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    studio_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    special_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Packages table
CREATE TABLE public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    photos_count INTEGER DEFAULT 0,
    videos_count INTEGER DEFAULT 0,
    reels_count INTEGER DEFAULT 0,
    drone_included BOOLEAN DEFAULT false,
    album_size TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team members table
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    member_type team_member_type NOT NULL,
    employment_type employment_type NOT NULL DEFAULT 'in_house',
    is_available BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    event_type event_type NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    location TEXT,
    venue_details TEXT,
    status booking_status NOT NULL DEFAULT 'inquiry',
    total_amount DECIMAL(10,2) DEFAULT 0,
    advance_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) DEFAULT 0,
    payment_status payment_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking team assignments
CREATE TABLE public.booking_team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    team_member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (booking_id, team_member_id)
);

-- Media folders table
CREATE TABLE public.media_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    folder_type TEXT NOT NULL DEFAULT 'general',
    parent_folder_id UUID REFERENCES public.media_folders(id) ON DELETE CASCADE,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Media files table
CREATE TABLE public.media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES public.media_folders(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    is_selected BOOLEAN DEFAULT false,
    selection_comment TEXT,
    watermarked_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Temporary access table (CORE FEATURE)
CREATE TABLE public.temporary_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    folder_id UUID REFERENCES public.media_folders(id) ON DELETE CASCADE NOT NULL,
    access_token TEXT NOT NULL UNIQUE,
    access_password TEXT,
    client_name TEXT,
    client_email TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    max_selections INTEGER,
    watermark_enabled BOOLEAN DEFAULT true,
    download_disabled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Selection log for tracking
CREATE TABLE public.selection_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporary_access_id UUID REFERENCES public.temporary_access(id) ON DELETE CASCADE NOT NULL,
    media_file_id UUID REFERENCES public.media_files(id) ON DELETE CASCADE NOT NULL,
    selected BOOLEAN DEFAULT true,
    comment TEXT,
    selected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'pending',
    assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type TEXT NOT NULL DEFAULT 'advance',
    payment_method TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity log table
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create has_role function for secure role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if temporary access is valid
CREATE OR REPLACE FUNCTION public.is_temp_access_valid(access_token TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.temporary_access
    WHERE temporary_access.access_token = is_temp_access_valid.access_token
      AND is_active = true
      AND expires_at > now()
  )
$$;

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile and assign admin role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for clients
CREATE POLICY "Owners can view own clients" ON public.clients FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own clients" ON public.clients FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own clients" ON public.clients FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for packages
CREATE POLICY "Owners can view own packages" ON public.packages FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert packages" ON public.packages FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own packages" ON public.packages FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own packages" ON public.packages FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for team_members
CREATE POLICY "Owners can view own team" ON public.team_members FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert team members" ON public.team_members FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own team" ON public.team_members FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own team" ON public.team_members FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for bookings
CREATE POLICY "Owners can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own bookings" ON public.bookings FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for booking_team
CREATE POLICY "Owners can manage booking team" ON public.booking_team FOR ALL USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_team.booking_id AND bookings.owner_id = auth.uid())
);

-- RLS Policies for media_folders
CREATE POLICY "Owners can manage own folders" ON public.media_folders FOR ALL USING (auth.uid() = owner_id);

-- RLS Policies for media_files
CREATE POLICY "Owners can manage own files" ON public.media_files FOR ALL USING (auth.uid() = owner_id);

-- RLS Policies for temporary_access
CREATE POLICY "Owners can manage temp access" ON public.temporary_access FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Valid token holders can view" ON public.temporary_access FOR SELECT USING (public.is_temp_access_valid(access_token));

-- RLS Policies for selection_log
CREATE POLICY "Owners can view selection logs" ON public.selection_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.temporary_access WHERE temporary_access.id = selection_log.temporary_access_id AND temporary_access.owner_id = auth.uid())
);
CREATE POLICY "Valid token can insert selection" ON public.selection_log FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.temporary_access WHERE temporary_access.id = selection_log.temporary_access_id AND public.is_temp_access_valid(temporary_access.access_token))
);

-- RLS Policies for tasks
CREATE POLICY "Owners can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = owner_id);

-- RLS Policies for payments
CREATE POLICY "Owners can manage own payments" ON public.payments FOR ALL USING (auth.uid() = owner_id);

-- RLS Policies for activity_log
CREATE POLICY "Owners can view own activity" ON public.activity_log FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert activity" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = owner_id);