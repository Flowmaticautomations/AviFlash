// Generated from the live AV Flash dev Supabase project (ref vpmijgumroflnkcvxwpv)
// via the Supabase MCP generate_typescript_types tool. Regenerate after any
// schema change instead of hand-editing.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      card_images: {
        Row: {
          created_at: string
          flashcard_id: string
          id: string
          side: string
          sort_order: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flashcard_id: string
          id?: string
          side: string
          sort_order?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          flashcard_id?: string
          id?: string
          side?: string
          sort_order?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_images_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          name: string
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          name: string
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          name?: string
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          answer_text: string | null
          archived: boolean
          card_order: number
          created_at: string
          deck_id: string
          id: string
          question_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_text?: string | null
          archived?: boolean
          card_order?: number
          created_at?: string
          deck_id: string
          id?: string
          question_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_text?: string | null
          archived?: boolean
          card_order?: number
          created_at?: string
          deck_id?: string
          id?: string
          question_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string | null
          birth_year: number | null
          country: string
          created_at: string
          email: string | null
          first_name: string | null
          grade_or_year: string | null
          id: string
          phone: string | null
          profile_completed: boolean
          role: string
          surname: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          birth_year?: number | null
          country?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          grade_or_year?: string | null
          id: string
          phone?: string | null
          profile_completed?: boolean
          role?: string
          surname?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          birth_year?: number | null
          country?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          grade_or_year?: string | null
          id?: string
          phone?: string | null
          profile_completed?: boolean
          role?: string
          surname?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_answers: {
        Row: {
          answered_at: string
          flashcard_id: string
          id: string
          marked_correct: boolean
          review_session_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          flashcard_id: string
          id?: string
          marked_correct: boolean
          review_session_id: string
          user_id: string
        }
        Update: {
          answered_at?: string
          flashcard_id?: string
          id?: string
          marked_correct?: boolean
          review_session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_answers_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_answers_review_session_id_fkey"
            columns: ["review_session_id"]
            isOneToOne: false
            referencedRelation: "review_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      review_sessions: {
        Row: {
          accuracy_percent: number | null
          completed_at: string | null
          correct_count: number
          deck_id: string
          id: string
          incorrect_count: number
          order_mode: string
          started_at: string
          total_cards: number
          user_id: string
          was_completed: boolean
        }
        Insert: {
          accuracy_percent?: number | null
          completed_at?: string | null
          correct_count?: number
          deck_id: string
          id?: string
          incorrect_count?: number
          order_mode: string
          started_at?: string
          total_cards?: number
          user_id: string
          was_completed?: boolean
        }
        Update: {
          accuracy_percent?: number | null
          completed_at?: string | null
          correct_count?: number
          deck_id?: string
          id?: string
          incorrect_count?: number
          order_mode?: string
          started_at?: string
          total_cards?: number
          user_id?: string
          was_completed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "review_sessions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          academic_year: string | null
          archived: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year?: string | null
          archived?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year?: string | null
          archived?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          data_deletion_scheduled_at: string | null
          id: string
          paid_until: string | null
          payment_provider: string | null
          status: string
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_deletion_scheduled_at?: string | null
          id?: string
          paid_until?: string | null
          payment_provider?: string | null
          status?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_deletion_scheduled_at?: string | null
          id?: string
          paid_until?: string | null
          payment_provider?: string | null
          status?: string
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]
