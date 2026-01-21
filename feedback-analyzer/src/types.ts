// TypeScript types for Feedback Analyzer V2

export interface Env {
  DB: D1Database;
  AI?: any;  // Optional for local mode
}

export interface Tweet {
  id?: number;
  tweet_id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface Analysis {
  id?: number;
  tweet_id: string;
  suggested_category: string;   // LLM's original suggestion
  final_category: string;         // After PM override (if any)
  confidence_score?: number;
  urgency_score: number;
  analyzed_at?: string;
}

export interface Correction {
  id?: number;
  tweet_id: string;
  original_category: string;
  corrected_category: string;
  tweet_text: string;
  corrected_at?: string;
}

export interface TweetWithAnalysis {
  tweet_id: string;
  text: string;
  author: string;
  timestamp: string;
  suggested_category: string;
  final_category: string;
  confidence_score: number;
  urgency_score: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  avg_urgency: number;
}

export interface DashboardData {
  summary: {
    total_tweets: number;
    analyzed_tweets: number;
    total_corrections: number;
  };
  category_stats: CategoryStats[];
  all_categories: string[];  // For dropdown options
  recent_corrections: Correction[];
}
