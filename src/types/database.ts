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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      goals: {
        Row: {
          ai_breakdown_metadata: Json | null
          created_at: string
          description: string | null
          goal_type: string
          id: string
          status: string
          target_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_breakdown_metadata?: Json | null
          created_at?: string
          description?: string | null
          goal_type?: string
          id?: string
          status?: string
          target_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_breakdown_metadata?: Json | null
          created_at?: string
          description?: string | null
          goal_type?: string
          id?: string
          status?: string
          target_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          goal_id: string
          id: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          goal_id: string
          id?: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          goal_id?: string
          id?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_check_ins: {
        Row: {
          action: string
          created_at: string
          id: string
          new_due_date: string | null
          new_status: string | null
          note: string | null
          previous_due_date: string | null
          previous_status: string | null
          reschedule_reason: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_due_date?: string | null
          new_status?: string | null
          note?: string | null
          previous_due_date?: string | null
          previous_status?: string | null
          reschedule_reason?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_due_date?: string | null
          new_status?: string | null
          note?: string | null
          previous_due_date?: string | null
          previous_status?: string | null
          reschedule_reason?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_check_ins_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          goal_id: string | null
          id: string
          priority: number
          project_id: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          goal_id?: string | null
          id?: string
          priority?: number
          project_id?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          goal_id?: string | null
          id?: string
          priority?: number
          project_id?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          notification_intensity: string
          onboarding_complete: boolean
          phone: string | null
          push_token: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_opt_in: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          notification_intensity?: string
          onboarding_complete?: boolean
          phone?: string | null
          push_token?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_opt_in?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notification_intensity?: string
          onboarding_complete?: boolean
          phone?: string | null
          push_token?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_opt_in?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
