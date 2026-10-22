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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          image_url: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price_etb_cents: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          id?: string
          image_url?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price_etb_cents: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price_etb_cents?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          deposit_etb_cents: number
          id: string
          idempotency_key: string | null
          order_type: "sourcing" | "seller_listing"
          reference: string
          request_hash: string | null
          seller_id: string | null
          seller_responded_at: string | null
          seller_response: "pending" | "accepted" | "declined" | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_etb_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          deposit_etb_cents: number
          id?: string
          idempotency_key?: string | null
          order_type?: "sourcing" | "seller_listing"
          reference?: string
          request_hash?: string | null
          seller_id?: string | null
          seller_responded_at?: string | null
          seller_response?: "pending" | "accepted" | "declined" | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_etb_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          deposit_etb_cents?: number
          id?: string
          idempotency_key?: string | null
          order_type?: "sourcing" | "seller_listing"
          reference?: string
          request_hash?: string | null
          seller_id?: string | null
          seller_responded_at?: string | null
          seller_response?: "pending" | "accepted" | "declined" | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_etb_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          amount_etb_cents: number
          checkout_url: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          order_id: string
          provider: string
          provider_reference: string | null
          purpose: string
          status: Database["public"]["Enums"]["payment_attempt_status"]
          updated_at: string
        }
        Insert: {
          amount_etb_cents: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key: string
          order_id: string
          provider: string
          provider_reference?: string | null
          purpose?: string
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          updated_at?: string
        }
        Update: {
          amount_etb_cents?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          order_id?: string
          provider?: string
          provider_reference?: string | null
          purpose?: string
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_events: {
        Row: {
          attempt_id: string
          event_type: string
          id: string
          processed_at: string | null
          processing_result: string | null
          provider: string
          provider_event_id: string
          received_at: string
        }
        Insert: {
          attempt_id: string
          event_type: string
          id?: string
          processed_at?: string | null
          processing_result?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
        }
        Update: {
          attempt_id?: string
          event_type?: string
          id?: string
          processed_at?: string | null
          processing_result?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_provider_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          order_event_id: string
          order_id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_event_id: string
          order_id: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_event_id?: string
          order_id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_order_event_id_fkey"
            columns: ["order_event_id"]
            isOneToOne: false
            referencedRelation: "order_events"
            referencedColumns: ["id"]
          },
        ]
      }
      support_cases: {
        Row: {
          category: "order_status" | "listing_or_product" | "seller_communication" | "other"
          created_at: string
          id: string
          opened_by: string
          order_id: string
          status: Database["public"]["Enums"]["support_case_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          category: "order_status" | "listing_or_product" | "seller_communication" | "other"
          created_at?: string
          id?: string
          opened_by: string
          order_id: string
          status?: Database["public"]["Enums"]["support_case_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          category?: "order_status" | "listing_or_product" | "seller_communication" | "other"
          created_at?: string
          id?: string
          opened_by?: string
          order_id?: string
          status?: Database["public"]["Enums"]["support_case_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      support_case_messages: {
        Row: { body: string; case_id: string; created_at: string; id: string; sender_id: string }
        Insert: { body: string; case_id: string; created_at?: string; id?: string; sender_id: string }
        Update: { body?: string; case_id?: string; created_at?: string; id?: string; sender_id?: string }
        Relationships: [
          {
            foreignKeyName: "support_case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "support_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      support_case_events: {
        Row: { actor_id: string | null; case_id: string; created_at: string; id: string; note: string; status: Database["public"]["Enums"]["support_case_status"] }
        Insert: { actor_id?: string | null; case_id: string; created_at?: string; id?: string; note: string; status: Database["public"]["Enums"]["support_case_status"] }
        Update: { actor_id?: string | null; case_id?: string; created_at?: string; id?: string; note?: string; status?: Database["public"]["Enums"]["support_case_status"] }
        Relationships: [
          {
            foreignKeyName: "support_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "support_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          id: string
          inventory_committed: number
          inventory_limit: number | null
          is_available: boolean
          label: string
          price_delta_etb_cents: number
          product_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          inventory_committed?: number
          inventory_limit?: number | null
          is_available?: boolean
          label: string
          price_delta_etb_cents?: number
          product_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          inventory_committed?: number
          inventory_limit?: number | null
          is_available?: boolean
          label?: string
          price_delta_etb_cents?: number
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          created_at: string
          delivery_days: number
          deposit_percent: number
          description: string | null
          id: string
          image_url: string | null
          is_published: boolean
          listing_type: "sourcing" | "seller"
          name: string
          price_etb_cents: number
          seller_user_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          delivery_days?: number
          deposit_percent?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          listing_type?: "sourcing" | "seller"
          name: string
          price_etb_cents: number
          seller_user_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          delivery_days?: number
          deposit_percent?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          listing_type?: "sourcing" | "seller"
          name?: string
          price_etb_cents?: number
          seller_user_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          business_name: string
          created_at: string
          description: string | null
          id: string
          phone: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["seller_status"]
          user_id: string
        }
        Insert: {
          business_name: string
          created_at?: string
          description?: string | null
          id?: string
          phone?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["seller_status"]
          user_id: string
        }
        Update: {
          business_name?: string
          created_at?: string
          description?: string | null
          id?: string
          phone?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["seller_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          base_city: string
          business_name: string
          created_at: string
          id: string
          notes: string | null
          phone: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          user_id: string
        }
        Insert: {
          base_city?: string
          business_name: string
          created_at?: string
          id?: string
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          user_id: string
        }
        Update: {
          base_city?: string
          business_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_review_supplier: {
        Args: {
          _status: Database["public"]["Enums"]["supplier_status"]
          _supplier_id: string
        }
        Returns: undefined
      }
      admin_review_seller: {
        Args: {
          _seller_id: string
          _status: Database["public"]["Enums"]["seller_status"]
        }
        Returns: undefined
      }
      cancel_unpaid_order: {
        Args: { _order_id: string; _reason: string }
        Returns: undefined
      }
      create_order_support_case: {
        Args: { _category: string; _message: string; _order_id: string; _subject: string }
        Returns: string
      }
      reply_to_order_support_case: {
        Args: { _body: string; _case_id: string }
        Returns: string
      }
      admin_set_support_case_status: {
        Args: { _case_id: string; _note: string; _status: Database["public"]["Enums"]["support_case_status"] }
        Returns: undefined
      }
      create_seller_listing: {
        Args: {
          _brand: string
          _category_id: string | null
          _delivery_days: number
          _deposit_percent: number
          _description: string
          _image_url: string
          _name: string
          _price_etb_cents: number
          _slug: string
          _variant_labels: string[]
        }
        Returns: string
      }
      reserve_seller_order: {
        Args: { _quantity: number; _request_key: string; _variant_id: string }
        Returns: string
      }
      seller_respond_to_order: {
        Args: { _order_id: string; _response: "accepted" | "declined" }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { _notification_id: string }
        Returns: undefined
      }
      reserve_sourcing_order: {
        Args: { _quantity: number; _request_key: string; _variant_id: string }
        Returns: string
      }
      admin_set_order_status: {
        Args: {
          _note: string
          _order_id: string
          _status: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reserve_order: {
        Args: { _quantity: number; _variant_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "customer" | "supplier" | "admin"
      seller_status: "pending" | "verified" | "rejected" | "suspended"
      order_status:
        | "draft"
        | "awaiting_customer_deposit"
        | "confirmed"
        | "open_for_assignment"
        | "assignment_payment_pending"
        | "assigned"
        | "purchased"
        | "in_transit"
        | "arrived"
        | "ready_for_handover"
        | "seller_preparing"
        | "seller_in_delivery"
        | "delivered"
        | "cancelled"
        | "expired"
        | "disputed"
      payment_attempt_status:
        | "pending"
        | "checkout_started"
        | "succeeded"
        | "failed"
        | "cancelled"
        | "expired"
      support_case_status: "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed"
      supplier_status: "pending" | "verified" | "rejected" | "suspended"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["customer", "supplier", "admin"],
      seller_status: ["pending", "verified", "rejected", "suspended"],
      order_status: [
        "draft",
        "awaiting_customer_deposit",
        "confirmed",
        "open_for_assignment",
        "assignment_payment_pending",
        "assigned",
        "purchased",
        "in_transit",
        "arrived",
        "ready_for_handover",
        "seller_preparing",
        "seller_in_delivery",
        "delivered",
        "cancelled",
        "expired",
        "disputed",
      ],
      payment_attempt_status: [
        "pending",
        "checkout_started",
        "succeeded",
        "failed",
        "cancelled",
        "expired",
      ],
      support_case_status: ["open", "in_progress", "waiting_on_customer", "resolved", "closed"],
      supplier_status: ["pending", "verified", "rejected", "suspended"],
    },
  },
} as const
