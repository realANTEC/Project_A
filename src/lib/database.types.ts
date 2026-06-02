/**
 * Hand-written Supabase schema types (mirrors supabase/schema.sql).
 * If you install the Supabase CLI you can regenerate this with:
 *   supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */

type Ts = string

export type Aspect = 'portrait' | 'square' | 'landscape'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          name: string
          avatar_url: string | null
          bio: string | null
          website: string | null
          verified: boolean
          created_at: Ts
        }
        Insert: {
          id: string
          username: string
          name?: string
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          verified?: boolean
          created_at?: Ts
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          author_id: string
          image_url: string
          aspect: Aspect
          tint: string[]
          location: string | null
          caption: string
          tags: string[]
          created_at: Ts
        }
        Insert: {
          id?: string
          author_id: string
          image_url: string
          aspect?: Aspect
          tint?: string[]
          location?: string | null
          caption?: string
          tags?: string[]
          created_at?: Ts
        }
        Update: Partial<Database['public']['Tables']['posts']['Insert']>
        Relationships: []
      }
      likes: {
        Row: { user_id: string; post_id: string; created_at: Ts }
        Insert: { user_id: string; post_id: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['likes']['Insert']>
        Relationships: []
      }
      saves: {
        Row: { user_id: string; post_id: string; created_at: Ts }
        Insert: { user_id: string; post_id: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['saves']['Insert']>
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          parent_id: string | null
          body: string
          created_at: Ts
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          parent_id?: string | null
          body: string
          created_at?: Ts
        }
        Update: Partial<Database['public']['Tables']['comments']['Insert']>
        Relationships: []
      }
      follows: {
        Row: { follower_id: string; following_id: string; created_at: Ts }
        Insert: { follower_id: string; following_id: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['follows']['Insert']>
        Relationships: []
      }
      conversations: {
        Row: { id: string; created_at: Ts }
        Insert: { id?: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>
        Relationships: []
      }
      conversation_members: {
        Row: { conversation_id: string; user_id: string }
        Insert: { conversation_id: string; user_id: string }
        Update: Partial<Database['public']['Tables']['conversation_members']['Insert']>
        Relationships: []
      }
      messages: {
        Row: { id: string; conversation_id: string; sender_id: string; body: string; created_at: Ts }
        Insert: { id?: string; conversation_id: string; sender_id: string; body: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_member: { Args: { conv: string }; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type PostRow = Database['public']['Tables']['posts']['Row']
export type CommentRow = Database['public']['Tables']['comments']['Row']
export type MessageRow = Database['public']['Tables']['messages']['Row']
