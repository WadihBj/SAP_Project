import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for database schema
export interface LostFoundReport {
  id?: string;
  created_at?: string;
  report_type: "lost" | "found";
  title: string;
  description: string;
  location_text?: string;
  language?: string;
  extracted_data: {
    meta: {
      reportType: "lost" | "found";
      language: string;
      confidenceNotes: string;
    };
    itemIdentity: {
      category: string;
      brand: string;
      model: string;
      serialOrTag: string;
      textOnItem: string;
    };
    appearance: {
      primaryColor: string;
      secondaryColors: string[];
      material: string;
      size: string;
      condition: string;
      distinctiveMarks: string[];
    };
    contents: {
      contains: string[];
      containsSensitiveItems: boolean;
    };
    location: {
      placeName: string;
      locationType: string;
      confidence: number;
    };
    time: {
      mentioned: boolean;
      whenText: string;
    };
    privacy: {
      sensitiveInfoPresent: boolean;
      sensitiveInfoTypes: string[];
    };
    matching: {
      keywords: string[];
      mustMatch: string[];
      niceToMatch: string[];
    };
  };
}
