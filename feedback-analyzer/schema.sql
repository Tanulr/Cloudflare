-- Tweets table: stores raw Twitter/X feedback
CREATE TABLE IF NOT EXISTS tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT UNIQUE NOT NULL,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analysis table: stores LLM-suggested and final categories
CREATE TABLE IF NOT EXISTS analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT NOT NULL,
    suggested_category TEXT NOT NULL,  -- LLM's suggestion
    final_category TEXT NOT NULL,       -- After PM override (if any)
    confidence_score REAL,
    urgency_score INTEGER NOT NULL,
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tweet_id) REFERENCES tweets(tweet_id)
);

-- Corrections table: stores PM overrides for LLM learning
CREATE TABLE IF NOT EXISTS corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT NOT NULL,
    original_category TEXT NOT NULL,
    corrected_category TEXT NOT NULL,
    tweet_text TEXT NOT NULL,
    corrected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tweet_id) REFERENCES tweets(tweet_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analysis_final_category ON analysis(final_category);
CREATE INDEX IF NOT EXISTS idx_corrections_timestamp ON corrections(corrected_at);
