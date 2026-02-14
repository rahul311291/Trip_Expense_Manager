import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  console.error('Missing Supabase environment variables')
  console.error('VITE_SUPABASE_URL:', supabaseUrl)
  console.error('VITE_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey)
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      members: {
        Row: {
          id: string
          trip_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          name?: string
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          trip_id: string
          name: string
          amount: string
          currency: string
          paid_by_member_id: string
          date: string
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          name: string
          amount: string
          currency?: string
          paid_by_member_id: string
          date?: string
          category?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          name?: string
          amount?: string
          currency?: string
          paid_by_member_id?: string
          date?: string
          category?: string
          created_at?: string
          updated_at?: string
        }
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          member_id: string
          share_amount: string
          created_at: string
        }
        Insert: {
          id?: string
          expense_id: string
          member_id: string
          share_amount: string
          created_at?: string
        }
        Update: {
          id?: string
          expense_id?: string
          member_id?: string
          share_amount?: string
          created_at?: string
        }
      }
    }
  }
}
