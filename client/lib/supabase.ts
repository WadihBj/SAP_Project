import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Please check your .env.local file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type ItemStatus = "submitted" | "match found" | "found";

export interface LostItem {
  id: string;
  created_at: string;
  item_name: string;
  description: string;
  image_url: string | null;
  status: ItemStatus;
  founder_name: string | null;
  found_at: string | null;
}

export type InquiryStatus = "submitted" | "matched" | "resolved";

export interface UserInquiry {
  id: string;
  inquiry_number: number;
  created_at: string;
  phone_number: string;
  sms_text: string | null;
  image_urls: string[] | null;
  extracted_title: string | null;
  extracted_description: string | null;
  extracted_category: string | null;
  extracted_type: "LOST" | "FOUND" | null;
  status: InquiryStatus;
  ai_confidence: number | null;
  assistant_notes: string | null;
  resolved_at: string | null;
}

export interface InquiryMatch {
  id: string;
  inquiry_id: string;
  lost_item_id: string;
  confidence_score: number;
  ai_reasoning: string | null;
  assistant_approved: boolean;
  created_at: string;
  lost_items?: LostItem;
}
