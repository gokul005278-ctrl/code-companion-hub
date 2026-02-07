export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          owner_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          owner_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          owner_id?: string
        }
        Relationships: []
      }
      booking_tasks: {
        Row: {
          assigned_to: string | null
          booking_id: string
          created_at: string
          description: string | null
          id: string
          notes: string | null
          owner_id: string
          progress: number | null
          scheduled_date: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          booking_id: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          progress?: number | null
          scheduled_date?: string | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          progress?: number | null
          scheduled_date?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_team: {
        Row: {
          assigned_at: string
          booking_id: string
          id: string
          team_member_id: string
        }
        Insert: {
          assigned_at?: string
          booking_id: string
          id?: string
          team_member_id: string
        }
        Update: {
          assigned_at?: string
          booking_id?: string
          id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_team_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_team_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          advance_amount: number | null
          balance_amount: number | null
          client_id: string | null
          created_at: string
          event_date: string
          event_time: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          location: string | null
          notes: string | null
          owner_id: string
          package_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number | null
          updated_at: string
          venue_details: string | null
        }
        Insert: {
          advance_amount?: number | null
          balance_amount?: number | null
          client_id?: string | null
          created_at?: string
          event_date: string
          event_time?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          notes?: string | null
          owner_id: string
          package_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number | null
          updated_at?: string
          venue_details?: string | null
        }
        Update: {
          advance_amount?: number | null
          balance_amount?: number | null
          client_id?: string | null
          created_at?: string
          event_date?: string
          event_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          notes?: string | null
          owner_id?: string
          package_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number | null
          updated_at?: string
          venue_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          special_instructions: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          special_instructions?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          special_instructions?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          booking_id: string | null
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          owner_id: string
          payment_method: string | null
          receipt_url: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          owner_id: string
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          owner_id?: string
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_embed_settings: {
        Row: {
          button_text: string | null
          created_at: string
          embed_token: string
          form_fields: Json | null
          id: string
          is_active: boolean | null
          owner_id: string
          success_message: string | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          created_at?: string
          embed_token: string
          form_fields?: Json | null
          id?: string
          is_active?: boolean | null
          owner_id: string
          success_message?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          created_at?: string
          embed_token?: string
          form_fields?: Json | null
          id?: string
          is_active?: boolean | null
          owner_id?: string
          success_message?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          budget: string | null
          converted_at: string | null
          converted_client_id: string | null
          created_at: string
          email: string | null
          event_date: string | null
          event_type: string | null
          follow_up_date: string | null
          id: string
          location: string | null
          message: string | null
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          priority: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget?: string | null
          converted_at?: string | null
          converted_client_id?: string | null
          created_at?: string
          email?: string | null
          event_date?: string | null
          event_type?: string | null
          follow_up_date?: string | null
          id?: string
          location?: string | null
          message?: string | null
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          priority?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget?: string | null
          converted_at?: string | null
          converted_client_id?: string | null
          created_at?: string
          email?: string | null
          event_date?: string | null
          event_type?: string | null
          follow_up_date?: string | null
          id?: string
          location?: string | null
          message?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          priority?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          folder_id: string
          id: string
          is_selected: boolean | null
          owner_id: string
          selection_comment: string | null
          watermarked_url: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          folder_id: string
          id?: string
          is_selected?: boolean | null
          owner_id: string
          selection_comment?: string | null
          watermarked_url?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          folder_id?: string
          id?: string
          is_selected?: boolean | null
          owner_id?: string
          selection_comment?: string | null
          watermarked_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_folders: {
        Row: {
          booking_id: string | null
          client_id: string | null
          created_at: string
          folder_type: string
          id: string
          name: string
          owner_id: string
          parent_folder_id: string | null
          storage_path: string | null
        }
        Insert: {
          booking_id?: string | null
          client_id?: string | null
          created_at?: string
          folder_type?: string
          id?: string
          name: string
          owner_id: string
          parent_folder_id?: string | null
          storage_path?: string | null
        }
        Update: {
          booking_id?: string | null
          client_id?: string | null
          created_at?: string
          folder_type?: string
          id?: string
          name?: string
          owner_id?: string
          parent_folder_id?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_folders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          album_pages: number | null
          album_size: string | null
          base_price: number
          candid_included: boolean | null
          created_at: string
          delivery_days: number | null
          description: string | null
          drone_included: boolean | null
          exclusions: string[] | null
          highlights: string[] | null
          id: string
          inclusions: string[] | null
          is_active: boolean | null
          name: string
          owner_id: string
          photos_count: number | null
          pre_wedding_included: boolean | null
          reels_count: number | null
          traditional_included: boolean | null
          updated_at: string
          videos_count: number | null
        }
        Insert: {
          album_pages?: number | null
          album_size?: string | null
          base_price?: number
          candid_included?: boolean | null
          created_at?: string
          delivery_days?: number | null
          description?: string | null
          drone_included?: boolean | null
          exclusions?: string[] | null
          highlights?: string[] | null
          id?: string
          inclusions?: string[] | null
          is_active?: boolean | null
          name: string
          owner_id: string
          photos_count?: number | null
          pre_wedding_included?: boolean | null
          reels_count?: number | null
          traditional_included?: boolean | null
          updated_at?: string
          videos_count?: number | null
        }
        Update: {
          album_pages?: number | null
          album_size?: string | null
          base_price?: number
          candid_included?: boolean | null
          created_at?: string
          delivery_days?: number | null
          description?: string | null
          drone_included?: boolean | null
          exclusions?: string[] | null
          highlights?: string[] | null
          id?: string
          inclusions?: string[] | null
          is_active?: boolean | null
          name?: string
          owner_id?: string
          photos_count?: number | null
          pre_wedding_included?: boolean | null
          reels_count?: number | null
          traditional_included?: boolean | null
          updated_at?: string
          videos_count?: number | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          payment_date: string
          payment_method: string | null
          payment_type: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          studio_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          studio_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          studio_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      selection_log: {
        Row: {
          comment: string | null
          id: string
          media_file_id: string
          selected: boolean | null
          selected_at: string
          temporary_access_id: string
        }
        Insert: {
          comment?: string | null
          id?: string
          media_file_id: string
          selected?: boolean | null
          selected_at?: string
          temporary_access_id: string
        }
        Update: {
          comment?: string | null
          id?: string
          media_file_id?: string
          selected?: boolean | null
          selected_at?: string
          temporary_access_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selection_log_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selection_log_temporary_access_id_fkey"
            columns: ["temporary_access_id"]
            isOneToOne: false
            referencedRelation: "temporary_access"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          booking_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          owner_id: string
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          booking_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id: string
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          id: string
          is_available: boolean | null
          member_type: Database["public"]["Enums"]["team_member_type"]
          name: string
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          is_available?: boolean | null
          member_type: Database["public"]["Enums"]["team_member_type"]
          name: string
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          is_available?: boolean | null
          member_type?: Database["public"]["Enums"]["team_member_type"]
          name?: string
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      temporary_access: {
        Row: {
          access_password: string | null
          access_token: string
          booking_id: string
          client_email: string | null
          client_name: string | null
          created_at: string
          download_disabled: boolean | null
          expires_at: string
          folder_id: string
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          max_selections: number | null
          owner_id: string
          watermark_enabled: boolean | null
        }
        Insert: {
          access_password?: string | null
          access_token: string
          booking_id: string
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          download_disabled?: boolean | null
          expires_at: string
          folder_id: string
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          max_selections?: number | null
          owner_id: string
          watermark_enabled?: boolean | null
        }
        Update: {
          access_password?: string | null
          access_token?: string
          booking_id?: string
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          download_disabled?: boolean | null
          expires_at?: string
          folder_id?: string
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          max_selections?: number | null
          owner_id?: string
          watermark_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "temporary_access_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporary_access_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_temp_access_valid: { Args: { access_token: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "temporary_client"
      booking_status:
        | "inquiry"
        | "confirmed"
        | "advance_paid"
        | "shoot_completed"
        | "delivered"
      employment_type: "in_house" | "freelance"
      event_type:
        | "wedding"
        | "engagement"
        | "birthday"
        | "corporate"
        | "reel"
        | "drone"
        | "other"
      payment_status: "pending" | "partial" | "paid"
      task_status: "pending" | "in_progress" | "completed"
      team_member_type:
        | "photographer"
        | "videographer"
        | "editor"
        | "drone_operator"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "temporary_client"],
      booking_status: [
        "inquiry",
        "confirmed",
        "advance_paid",
        "shoot_completed",
        "delivered",
      ],
      employment_type: ["in_house", "freelance"],
      event_type: [
        "wedding",
        "engagement",
        "birthday",
        "corporate",
        "reel",
        "drone",
        "other",
      ],
      payment_status: ["pending", "partial", "paid"],
      task_status: ["pending", "in_progress", "completed"],
      team_member_type: [
        "photographer",
        "videographer",
        "editor",
        "drone_operator",
        "other",
      ],
    },
  },
} as const
