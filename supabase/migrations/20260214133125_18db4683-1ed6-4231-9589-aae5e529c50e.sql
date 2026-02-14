-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON public.bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner_id ON public.payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_expenses_owner_id ON public.expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_booking_id ON public.expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON public.leads(follow_up_date);

CREATE INDEX IF NOT EXISTS idx_booking_tasks_booking_id ON public.booking_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_tasks_status ON public.booking_tasks(status);

CREATE INDEX IF NOT EXISTS idx_booking_team_booking_id ON public.booking_team(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_team_team_member_id ON public.booking_team(team_member_id);

CREATE INDEX IF NOT EXISTS idx_media_files_folder_id ON public.media_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_owner_id ON public.media_folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_booking_id ON public.media_folders(booking_id);

CREATE INDEX IF NOT EXISTS idx_temporary_access_access_token ON public.temporary_access(access_token);
CREATE INDEX IF NOT EXISTS idx_temporary_access_owner_id ON public.temporary_access(owner_id);

CREATE INDEX IF NOT EXISTS idx_team_members_owner_id ON public.team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member_type ON public.team_members(member_type);

CREATE INDEX IF NOT EXISTS idx_activity_log_owner_id ON public.activity_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_packages_owner_id ON public.packages(owner_id);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON public.packages(is_active);

CREATE INDEX IF NOT EXISTS idx_selection_log_temporary_access_id ON public.selection_log(temporary_access_id);
CREATE INDEX IF NOT EXISTS idx_selection_log_media_file_id ON public.selection_log(media_file_id);