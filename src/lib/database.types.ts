export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ApplicationStatus = "Applied" | "Link Opened" | "Interview" | "Rejected" | "Offer" | "Archived";
export type TrackingSource = "CV" | "Cover Letter" | "Email" | "Email Signature" | "LinkedIn Message" | "Portfolio" | "Other";
export type ClickType = "human" | "bot" | "duplicate" | "unknown";
export type CvEventType = "view" | "download";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type TrackingLink = Database["public"]["Tables"]["tracking_links"]["Row"];
export type Click = Database["public"]["Tables"]["clicks"]["Row"];
export type CvEvent = Database["public"]["Tables"]["cv_events"]["Row"];
export type TimelineEvent = Database["public"]["Tables"]["timeline_events"]["Row"];
export type Reminder = Database["public"]["Tables"]["reminders"]["Row"];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          notification_email: string | null;
          linkedin_url: string | null;
          cv_file_url: string | null;
          email_notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          notification_email?: string | null;
          linkedin_url?: string | null;
          cv_file_url?: string | null;
          email_notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          notification_email?: string | null;
          linkedin_url?: string | null;
          cv_file_url?: string | null;
          email_notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          job_title: string | null;
          recruiter_name: string | null;
          recruiter_email: string | null;
          application_url: string | null;
          status: ApplicationStatus;
          applied_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          job_title?: string | null;
          recruiter_name?: string | null;
          recruiter_email?: string | null;
          application_url?: string | null;
          status?: ApplicationStatus;
          applied_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          job_title?: string | null;
          recruiter_name?: string | null;
          recruiter_email?: string | null;
          application_url?: string | null;
          status?: ApplicationStatus;
          applied_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tracking_links: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          source: TrackingSource;
          slug: string;
          target_type: string;
          active: boolean;
          first_human_click_at: string | null;
          first_click_notification_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          source: TrackingSource;
          slug: string;
          target_type?: string;
          active?: boolean;
          first_human_click_at?: string | null;
          first_click_notification_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          source?: TrackingSource;
          slug?: string;
          target_type?: string;
          active?: boolean;
          first_human_click_at?: string | null;
          first_click_notification_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clicks: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          tracking_link_id: string;
          clicked_at: string;
          referrer: string | null;
          user_agent: string | null;
          ip_hash: string | null;
          country: string | null;
          browser: string | null;
          device_type: string | null;
          os: string | null;
          is_bot: boolean;
          is_duplicate: boolean;
          click_type: ClickType;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          tracking_link_id: string;
          clicked_at?: string;
          referrer?: string | null;
          user_agent?: string | null;
          ip_hash?: string | null;
          country?: string | null;
          browser?: string | null;
          device_type?: string | null;
          os?: string | null;
          is_bot?: boolean;
          is_duplicate?: boolean;
          click_type?: ClickType;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          tracking_link_id?: string;
          clicked_at?: string;
          referrer?: string | null;
          user_agent?: string | null;
          ip_hash?: string | null;
          country?: string | null;
          browser?: string | null;
          device_type?: string | null;
          os?: string | null;
          is_bot?: boolean;
          is_duplicate?: boolean;
          click_type?: ClickType;
          created_at?: string;
        };
        Relationships: [];
      };
      cv_events: {
        Row: {
          id: string;
          user_id: string;
          company_id: string | null;
          tracking_link_id: string | null;
          event_type: CvEventType;
          slug: string;
          ip_hash: string | null;
          user_agent: string | null;
          country: string | null;
          browser: string | null;
          device_type: string | null;
          os: string | null;
          is_bot: boolean;
          is_duplicate: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id?: string | null;
          tracking_link_id?: string | null;
          event_type: CvEventType;
          slug: string;
          ip_hash?: string | null;
          user_agent?: string | null;
          country?: string | null;
          browser?: string | null;
          device_type?: string | null;
          os?: string | null;
          is_bot?: boolean;
          is_duplicate?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string | null;
          tracking_link_id?: string | null;
          event_type?: CvEventType;
          slug?: string;
          ip_hash?: string | null;
          user_agent?: string | null;
          country?: string | null;
          browser?: string | null;
          device_type?: string | null;
          os?: string | null;
          is_bot?: boolean;
          is_duplicate?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      timeline_events: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          event_type: string;
          title: string;
          description: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          event_type: string;
          title: string;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          event_type?: string;
          title?: string;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          follow_up_at: string;
          follow_up_done: boolean;
          follow_up_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          follow_up_at: string;
          follow_up_done?: boolean;
          follow_up_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          follow_up_at?: string;
          follow_up_done?: boolean;
          follow_up_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      track_profile_click_and_get_target: {
        Args: {
          p_slug: string;
          p_referrer?: string | null;
          p_user_agent?: string | null;
          p_ip_hash?: string | null;
          p_country?: string | null;
          p_browser?: string | null;
          p_device_type?: string | null;
          p_os?: string | null;
          p_is_bot?: boolean;
        };
        Returns: {
          status: string;
          target_url: string | null;
          user_id: string | null;
          company_id: string | null;
          tracking_link_id: string | null;
          should_notify: boolean;
        }[];
      };
      track_cv_event_and_get_payload: {
        Args: {
          p_slug: string;
          p_event_type: CvEventType;
          p_user_agent?: string | null;
          p_ip_hash?: string | null;
          p_country?: string | null;
          p_browser?: string | null;
          p_device_type?: string | null;
          p_os?: string | null;
          p_is_bot?: boolean;
        };
        Returns: {
          status: string;
          linkedin_url: string | null;
          cv_file_url: string | null;
          full_name: string | null;
          company_name: string | null;
          job_title: string | null;
          user_id: string | null;
          company_id: string | null;
          tracking_link_id: string | null;
        }[];
      };
      mark_first_click_notification_sent: {
        Args: { p_tracking_link_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
