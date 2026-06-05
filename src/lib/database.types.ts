/**
 * Hand-written Supabase schema types (mirrors supabase/schema.sql).
 * If you install the Supabase CLI you can regenerate this with:
 *   supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 */

type Ts = string
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
      comment_likes: {
        Row: { user_id: string; comment_id: string; created_at: Ts }
        Insert: { user_id: string; comment_id: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['comment_likes']['Insert']>
        Relationships: []
      }
      follows: {
        Row: { follower_id: string; following_id: string; created_at: Ts }
        Insert: { follower_id: string; following_id: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['follows']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string
          type: 'follow' | 'like' | 'comment'
          post_id: string | null
          comment_id: string | null
          read: boolean
          created_at: Ts
        }
        Insert: {
          id?: string
          user_id: string
          actor_id: string
          type: 'follow' | 'like' | 'comment'
          post_id?: string | null
          comment_id?: string | null
          read?: boolean
          created_at?: Ts
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: []
      }
      conversations: {
        Row: { id: string; created_at: Ts }
        Insert: { id?: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>
        Relationships: []
      }
      conversation_members: {
        Row: { conversation_id: string; user_id: string; last_read_at: string | null }
        Insert: { conversation_id: string; user_id: string; last_read_at?: string | null }
        Update: Partial<Database['public']['Tables']['conversation_members']['Insert']>
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          body: string
          reply_to: string | null
          edited_at: Ts | null
          attachment: Json | null
          created_at: Ts
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          body: string
          reply_to?: string | null
          edited_at?: Ts | null
          attachment?: Json | null
          created_at?: Ts
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
        Relationships: []
      }
      message_reactions: {
        Row: { message_id: string; user_id: string; emoji: string; created_at: Ts }
        Insert: { message_id: string; user_id: string; emoji: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['message_reactions']['Insert']>
        Relationships: []
      }
      message_pins: {
        Row: { message_id: string; conversation_id: string; pinned_by: string; created_at: Ts }
        Insert: { message_id: string; conversation_id: string; pinned_by: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['message_pins']['Insert']>
        Relationships: []
      }
      polls: {
        Row: {
          id: string
          conversation_id: string
          created_by: string
          question: string
          options: string[]
          allow_multiple: boolean
          created_at: Ts
        }
        Insert: {
          id?: string
          conversation_id: string
          created_by: string
          question: string
          options: string[]
          allow_multiple?: boolean
          created_at?: Ts
        }
        Update: Partial<Database['public']['Tables']['polls']['Insert']>
        Relationships: []
      }
      poll_votes: {
        Row: { poll_id: string; user_id: string; option_index: number; created_at: Ts }
        Insert: { poll_id: string; user_id: string; option_index: number; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['poll_votes']['Insert']>
        Relationships: []
      }
      events: {
        Row: {
          id: string
          conversation_id: string
          created_by: string
          title: string
          description: string | null
          location: string | null
          starts_at: Ts
          created_at: Ts
        }
        Insert: {
          id?: string
          conversation_id: string
          created_by: string
          title: string
          description?: string | null
          location?: string | null
          starts_at: Ts
          created_at?: Ts
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: []
      }
      event_rsvps: {
        Row: { event_id: string; user_id: string; status: string; created_at: Ts }
        Insert: { event_id: string; user_id: string; status: string; created_at?: Ts }
        Update: Partial<Database['public']['Tables']['event_rsvps']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_member: { Args: { conv: string }; Returns: boolean }
      message_conversation: { Args: { msg: string }; Returns: string }
      poll_conversation: { Args: { p: string }; Returns: string }
      event_conversation: { Args: { e: string }; Returns: string }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type PostRow = Database['public']['Tables']['posts']['Row']
export type CommentRow = Database['public']['Tables']['comments']['Row']
export type MessageRow = Database['public']['Tables']['messages']['Row']
