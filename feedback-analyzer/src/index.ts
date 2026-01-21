/**
 * Feedback Analyzer V2 - Simplified with Category Bar Chart
 * 
 * Architecture:
 * - Workers: Main application
 * - D1: Store tweets, analysis, PM corrections
 * - Workers AI: Auto-categorize with learning from corrections
 */

import { Env, DashboardData, TweetWithAnalysis, CategoryStats } from './types';
import { AIAnalyzer } from './analyzer';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Dashboard homepage
      if (url.pathname === '/' || url.pathname === '') {
        return new Response(getDashboardHTML(), {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      // Analyze all tweets
      if (url.pathname === '/api/analyze' && request.method === 'POST') {
        const result = await analyzeAllTweets(env);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get dashboard data
      if (url.pathname === '/api/dashboard' && request.method === 'GET') {
        const data = await getDashboardData(env);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get tweets for specific category
      if (url.pathname.startsWith('/api/category/') && request.method === 'GET') {
        const category = decodeURIComponent(url.pathname.split('/').pop() || '');
        const tweets = await getTweetsByCategory(env, category);
        return new Response(JSON.stringify(tweets), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update tweet category (PM override)
      if (url.pathname === '/api/override' && request.method === 'POST') {
        const body = await request.json() as { tweet_id: string; new_category: string };
        await overrideCategory(env, body.tweet_id, body.new_category);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', { status: 404 });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Analyze all unanalyzed tweets
 */
async function analyzeAllTweets(env: Env): Promise<{ analyzed: number; message: string }> {
  const analyzer = new AIAnalyzer(env);

  // Get unanalyzed tweets
  const tweets = await env.DB.prepare(`
    SELECT t.* FROM tweets t
    LEFT JOIN analysis a ON t.tweet_id = a.tweet_id
    WHERE a.id IS NULL
  `).all();

  if (!tweets.results || tweets.results.length === 0) {
    return { analyzed: 0, message: 'No new tweets to analyze' };
  }

  let analyzed = 0;

  for (const tweet of tweets.results) {
    try {
      const tweetData = tweet as any;
      
      // Analyze tweet
      const analysis = await analyzer.analyzeTweet(tweetData.text);

      // Store analysis (suggested = final initially)
      await env.DB.prepare(`
        INSERT INTO analysis (tweet_id, suggested_category, final_category, confidence_score, urgency_score)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        tweetData.tweet_id,
        analysis.suggested_category,
        analysis.suggested_category,  // Same as suggested until PM overrides
        analysis.confidence_score,
        analysis.urgency_score
      ).run();

      analyzed++;
      console.log(`Analyzed ${tweetData.tweet_id}: ${analysis.suggested_category} (urgency: ${analysis.urgency_score})`);

    } catch (error) {
      console.error(`Failed to analyze tweet:`, error);
    }
  }

  return { 
    analyzed, 
    message: `Successfully analyzed ${analyzed} tweets` 
  };
}

/**
 * Get dashboard data
 */
async function getDashboardData(env: Env): Promise<DashboardData> {
  // Summary stats
  const summary = await env.DB.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM tweets) as total_tweets,
      (SELECT COUNT(*) FROM analysis) as analyzed_tweets,
      (SELECT COUNT(*) FROM corrections) as total_corrections
  `).first();

  // Category statistics
  const categoryStats = await env.DB.prepare(`
    SELECT 
      final_category as category,
      COUNT(*) as count,
      AVG(urgency_score) as avg_urgency
    FROM analysis
    GROUP BY final_category
    ORDER BY count DESC
  `).all();

  // All unique categories for dropdown
  const allCategories = await env.DB.prepare(`
    SELECT DISTINCT final_category as category
    FROM analysis
    ORDER BY final_category
  `).all();

  // Recent corrections
  const recentCorrections = await env.DB.prepare(`
    SELECT *
    FROM corrections
    ORDER BY corrected_at DESC
    LIMIT 10
  `).all();

  return {
    summary: summary as any,
    category_stats: (categoryStats.results || []) as CategoryStats[],
    all_categories: (allCategories.results || []).map((r: any) => r.category),
    recent_corrections: (recentCorrections.results || []) as any[]
  };
}

/**
 * Get all tweets for a specific category
 */
async function getTweetsByCategory(env: Env, category: string): Promise<TweetWithAnalysis[]> {
  const tweets = await env.DB.prepare(`
    SELECT 
      t.tweet_id,
      t.text,
      t.author,
      t.timestamp,
      a.suggested_category,
      a.final_category,
      a.confidence_score,
      a.urgency_score
    FROM tweets t
    JOIN analysis a ON t.tweet_id = a.tweet_id
    WHERE a.final_category = ?
    ORDER BY a.urgency_score DESC, t.timestamp DESC
  `).bind(category).all();

  return (tweets.results || []) as TweetWithAnalysis[];
}

/**
 * Override tweet category (PM correction)
 */
async function overrideCategory(env: Env, tweetId: string, newCategory: string): Promise<void> {
  // Get current analysis
  const current = await env.DB.prepare(`
    SELECT a.*, t.text as tweet_text
    FROM analysis a
    JOIN tweets t ON a.tweet_id = t.tweet_id
    WHERE a.tweet_id = ?
  `).bind(tweetId).first();

  if (!current) {
    throw new Error('Tweet not found');
  }

  const currentData = current as any;

  // Store correction for learning
  await env.DB.prepare(`
    INSERT INTO corrections (tweet_id, original_category, corrected_category, tweet_text)
    VALUES (?, ?, ?, ?)
  `).bind(
    tweetId,
    currentData.final_category,
    newCategory,
    currentData.tweet_text
  ).run();

  // Update analysis
  await env.DB.prepare(`
    UPDATE analysis
    SET final_category = ?
    WHERE tweet_id = ?
  `).bind(newCategory, tweetId).run();

  console.log(`Category overridden: ${tweetId} from ${currentData.final_category} to ${newCategory}`);
}

/**
 * Dashboard HTML with bar chart and category drill-down
 */
function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Analyzer - PM Tool</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .header {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    h1 {
      color: #2d3748;
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: #718096;
      font-size: 15px;
    }
    
    .controls {
      background: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      gap: 15px;
      align-items: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    button:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }
    
    button:disabled {
      background: #cbd5e0;
      cursor: not-allowed;
      transform: none;
    }
    
    .status {
      color: #4a5568;
      font-size: 14px;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .card h2 {
      color: #2d3748;
      font-size: 18px;
      margin-bottom: 15px;
    }
    
    .stat {
      font-size: 48px;
      font-weight: 700;
      color: #667eea;
      margin: 10px 0;
    }
    
    .label {
      color: #718096;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .bar-chart {
      margin-top: 20px;
    }
    
    .bar-item {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      cursor: pointer;
      padding: 10px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    
    .bar-item:hover {
      background: #f7fafc;
    }
    
    .bar-label {
      min-width: 150px;
      font-size: 14px;
      color: #2d3748;
      font-weight: 500;
    }
    
    .bar-visual {
      flex: 1;
      height: 32px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 6px;
      margin: 0 15px;
      position: relative;
      transition: all 0.3s;
    }
    
    .bar-item:hover .bar-visual {
      transform: scaleY(1.1);
    }
    
    .bar-count {
      font-size: 16px;
      color: #2d3748;
      font-weight: 700;
      min-width: 40px;
      text-align: right;
    }
    
    .tweets-list {
      margin-top: 20px;
    }
    
    .tweet {
      background: #f7fafc;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 4px solid #667eea;
    }
    
    .tweet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .tweet-author {
      color: #667eea;
      font-weight: 600;
      font-size: 14px;
    }
    
    .tweet-meta {
      display: flex;
      gap: 15px;
      align-items: center;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .badge-urgency {
      background: #fed7d7;
      color: #c53030;
    }
    
    .badge-category {
      background: #c6f6d5;
      color: #2f855a;
    }
    
    .tweet-text {
      color: #4a5568;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    
    .override-section {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }
    
    .override-label {
      font-size: 12px;
      color: #718096;
      font-weight: 500;
    }
    
    select {
      padding: 6px 12px;
      border: 1px solid #cbd5e0;
      border-radius: 6px;
      font-size: 13px;
      background: white;
      cursor: pointer;
    }
    
    .override-btn {
      padding: 6px 16px;
      font-size: 12px;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #718096;
    }
    
    .back-btn {
      background: #718096;
      margin-bottom: 15px;
    }
    
    .corrections-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
    }
    
    .correction-item {
      background: #edf2f7;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 13px;
    }
    
    .correction-arrow {
      color: #667eea;
      font-weight: bold;
      margin: 0 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Feedback Analyzer V2</h1>
      <p class="subtitle">AI-powered categorization with PM learning • Built with Cloudflare Workers, D1, Workers AI</p>
    </div>

    <div class="controls">
      <button id="analyzeBtn" onclick="analyzeTweets()">🤖 Analyze Tweets</button>
      <button onclick="loadDashboard()">🔄 Refresh</button>
      <span class="status" id="status">Ready</span>
    </div>

    <div id="loading" class="loading" style="display: none;">
      <h2>⏳ Loading...</h2>
    </div>

    <!-- Dashboard View -->
    <div id="dashboardView" style="display: none;">
      <div class="grid">
        <div class="card">
          <div class="label">Total Tweets</div>
          <div class="stat" id="totalTweets">0</div>
        </div>
        <div class="card">
          <div class="label">Analyzed</div>
          <div class="stat" id="analyzedTweets">0</div>
        </div>
        <div class="card">
          <div class="label">PM Corrections</div>
          <div class="stat" id="totalCorrections">0</div>
        </div>
      </div>

      <div class="card">
        <h2>📈 Feedback by Category (Click to View Tweets)</h2>
        <div class="bar-chart" id="barChart"></div>
      </div>

      <div class="card" id="correctionsCard" style="display: none;">
        <h2>📝 Recent PM Corrections (Learning Data)</h2>
        <div class="corrections-section" id="correctionsList"></div>
      </div>
    </div>

    <!-- Category Detail View -->
    <div id="categoryView" style="display: none;">
      <div class="card">
        <button class="back-btn" onclick="showDashboard()">← Back to Dashboard</button>
        <h2 id="categoryTitle">Category: </h2>
        <div class="tweets-list" id="tweetsList"></div>
      </div>
    </div>
  </div>

  <script>
    let allCategories = [];
    let currentCategory = null;

    async function analyzeTweets() {
      const btn = document.getElementById('analyzeBtn');
      const status = document.getElementById('status');
      
      btn.disabled = true;
      status.textContent = 'Analyzing with Workers AI...';
      
      try {
        const response = await fetch('/api/analyze', { method: 'POST' });
        const result = await response.json();
        
        status.textContent = result.message;
        setTimeout(() => loadDashboard(), 1000);
      } catch (error) {
        status.textContent = 'Error: ' + error.message;
      } finally {
        btn.disabled = false;
      }
    }

    async function loadDashboard() {
      document.getElementById('loading').style.display = 'block';
      document.getElementById('dashboardView').style.display = 'none';
      document.getElementById('categoryView').style.display = 'none';
      document.getElementById('status').textContent = 'Loading...';

      try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();

        // Update stats
        document.getElementById('totalTweets').textContent = data.summary.total_tweets || 0;
        document.getElementById('analyzedTweets').textContent = data.summary.analyzed_tweets || 0;
        document.getElementById('totalCorrections').textContent = data.summary.total_corrections || 0;

        // Store categories for dropdown
        allCategories = data.all_categories || [];

        // Render bar chart
        renderBarChart(data.category_stats);

        // Render corrections
        if (data.recent_corrections && data.recent_corrections.length > 0) {
          renderCorrections(data.recent_corrections);
          document.getElementById('correctionsCard').style.display = 'block';
        }

        document.getElementById('loading').style.display = 'none';
        document.getElementById('dashboardView').style.display = 'block';
        document.getElementById('status').textContent = 'Dashboard loaded';

      } catch (error) {
        document.getElementById('status').textContent = 'Error loading dashboard';
        console.error(error);
      }
    }

    function renderBarChart(stats) {
      const container = document.getElementById('barChart');
      
      if (stats.length === 0) {
        container.innerHTML = '<p style="color: #718096;">No data yet. Click "Analyze Tweets" to get started.</p>';
        return;
      }

      const maxCount = Math.max(...stats.map(s => s.count));
      
      container.innerHTML = stats.map(stat => {
        const width = (stat.count / maxCount) * 100;
        return \`
          <div class="bar-item" onclick="showCategory('\${stat.category}')">
            <div class="bar-label">\${stat.category}</div>
            <div class="bar-visual" style="width: \${width}%"></div>
            <div class="bar-count">\${stat.count}</div>
          </div>
        \`;
      }).join('');
    }

    async function showCategory(category) {
      currentCategory = category;
      document.getElementById('loading').style.display = 'block';
      document.getElementById('dashboardView').style.display = 'none';

      try {
        const response = await fetch(\`/api/category/\${encodeURIComponent(category)}\`);
        const tweets = await response.json();

        document.getElementById('categoryTitle').textContent = \`Category: \${category} (\${tweets.length} tweets)\`;
        renderTweets(tweets);

        document.getElementById('loading').style.display = 'none';
        document.getElementById('categoryView').style.display = 'block';
      } catch (error) {
        console.error(error);
        alert('Error loading tweets');
      }
    }

    function renderTweets(tweets) {
      const container = document.getElementById('tweetsList');
      
      container.innerHTML = tweets.map(tweet => \`
        <div class="tweet" id="tweet-\${tweet.tweet_id}">
          <div class="tweet-header">
            <span class="tweet-author">\${tweet.author}</span>
            <div class="tweet-meta">
              <span class="badge badge-urgency">Urgency: \${tweet.urgency_score}/10</span>
              <span class="badge badge-category">\${tweet.final_category}</span>
            </div>
          </div>
          <div class="tweet-text">\${tweet.text}</div>
          <div class="override-section">
            <span class="override-label">Override Category:</span>
            <select id="select-\${tweet.tweet_id}">
              \${allCategories.map(cat => 
                \`<option value="\${cat}" \${cat === tweet.final_category ? 'selected' : ''}>\${cat}</option>\`
              ).join('')}
              <option value="__new__">+ Add new category</option>
            </select>
            <button class="override-btn" onclick="overrideCategory('\${tweet.tweet_id}')">Save Override</button>
          </div>
        </div>
      \`).join('');
    }

    async function overrideCategory(tweetId) {
      const select = document.getElementById(\`select-\${tweetId}\`);
      let newCategory = select.value;

      if (newCategory === '__new__') {
        newCategory = prompt('Enter new category name (lowercase, use underscores):');
        if (!newCategory) return;
        newCategory = newCategory.toLowerCase().replace(/\s+/g, '_');
      }

      try {
        await fetch('/api/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tweet_id: tweetId, new_category: newCategory })
        });

        alert('Category updated! LLM will learn from this correction.');
        showCategory(currentCategory);  // Refresh view
      } catch (error) {
        alert('Error updating category');
        console.error(error);
      }
    }

    function renderCorrections(corrections) {
      const container = document.getElementById('correctionsList');
      
      container.innerHTML = corrections.map(corr => \`
        <div class="correction-item">
          <strong>\${corr.original_category}</strong>
          <span class="correction-arrow">→</span>
          <strong>\${corr.corrected_category}</strong>
          <br>
          <span style="color: #718096; font-size: 12px;">"\${corr.tweet_text.substring(0, 60)}..."</span>
        </div>
      \`).join('');
    }

    function showDashboard() {
      document.getElementById('categoryView').style.display = 'none';
      document.getElementById('dashboardView').style.display = 'block';
      currentCategory = null;
    }

    // Load dashboard on page load
    window.addEventListener('DOMContentLoaded', loadDashboard);
  </script>
</body>
</html>`;
}
