# 📊 Feedback Analyzer V2 - PM Learning Tool

AI-powered feedback categorization tool that learns from Product Manager corrections.

## 🎯 Overview

This tool helps Product Managers:
1. **Auto-categorize** Twitter feedback using AI
2. **Override incorrect tags** with dropdown
3. **Train the AI** by storing corrections in D1
4. **Visualize feedback** with interactive bar chart
5. **Drill down** into categories to see all related tweets

### Key Innovation: **Learning from PM Corrections**
- LLM suggests categories based on past PM corrections (few-shot learning)
- Every override is stored and used as training data
- System gets smarter over time

---

## 🏗️ Architecture

### Cloudflare Products (3 total)
1. **Workers** - Main application hosting
2. **D1 Database** - Stores tweets, analysis, and PM corrections
3. **Workers AI** - Auto-categorizes with Llama 3, learns from corrections

### Data Flow
```
Tweet → Workers AI (with few-shot examples from corrections) → Suggested Category
          ↓
PM Reviews → Override if wrong → Stored in D1 corrections table
          ↓
Next Tweet → Workers AI (now includes this correction as example) → Better Suggestion
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account (for Workers AI)

### Local Setup (5 minutes)

```bash
cd feedback-analyzer
npm install
npm run setup-db
npm run seed-data
npm run dev
```

Open: **http://localhost:8787**

**Note**: Local mode uses keyword-based categorization. For AI categorization, see "Remote Mode" below.

---

## 🤖 Enable Workers AI (Remote Mode)

For full AI-powered categorization with learning:

### 1. Create Cloudflare Account
Sign up (free): https://dash.cloudflare.com/sign-up

### 2. Login via Wrangler
```bash
npx wrangler login
```

### 3. Create Remote Database
```bash
npx wrangler d1 create feedback-db
```

Copy the `database_id` from output.

### 4. Update wrangler.toml
Replace `database_id = "feedback-db-local"` with your actual database ID.

### 5. Initialize Database
```bash
npm run setup-db-remote
npm run seed-data-remote
```

### 6. Run with Workers AI
```bash
npm run dev:remote
```

Open: **http://localhost:8787**

Now you have **full AI categorization with learning**!

---

## 📊 Features

### 1. Auto-Categorization
- AI suggests categories (e.g., `api_error`, `slow_performance`, `unclear_docs`)
- Categories are dynamic - not predefined
- Uses past PM corrections for better accuracy

### 2. Category Override (PM Correction)
- Dropdown on each tweet to change category
- Option to create new categories on-the-fly
- Corrections stored for future learning

### 3. Bar Chart Dashboard
- Visual breakdown of feedback by category
- Click any bar to drill down into tweets
- Shows count and average urgency per category

### 4. Tweet Detail View
- Shows all tweets for selected category
- Sorted by urgency (highest first)
- Each tweet has override dropdown

### 5. Learning Feedback Loop
- Recent corrections displayed on dashboard
- Each correction becomes few-shot example
- LLM prompts include up to 5 recent corrections

---

## 📁 Project Structure

```
feedback-analyzer/
├── src/
│   ├── index.ts          # Main Worker + Dashboard UI
│   ├── analyzer.ts       # AI categorization with learning
│   └── types.ts          # TypeScript interfaces
├── schema.sql            # D1 schema (tweets, analysis, corrections)
├── seed.sql              # 35 synthetic tweets
├── wrangler.toml         # Cloudflare configuration
├── package.json          # Dependencies
└── README.md             # This file
```

---

## 🎨 How It Works

### First Analysis (No Corrections Yet)
```
Tweet: "Workers AI throwing 500 errors"
→ LLM: Uses general knowledge → Suggests "api_error"
```

### After PM Correction
```
PM overrides: "api_error" → "workers_ai_error" (more specific)
→ Stored in corrections table
```

### Next Similar Tweet
```
Tweet: "Getting 500 from Workers AI Llama model"
→ LLM Prompt includes:
   "Example: Workers AI throwing 500 errors → workers_ai_error"
→ LLM: Suggests "workers_ai_error" ✅ (learned!)
```

---

## 🎯 User Workflow

### Step 1: Analyze Tweets
Click "🤖 Analyze Tweets" button
- Workers AI processes all 35 tweets
- Suggests categories for each
- Takes ~30 seconds

### Step 2: Review Categories
Click any bar in the chart
- See all tweets in that category
- Check if categorization is correct

### Step 3: Override Incorrect Tags
For miscategorized tweets:
1. Use dropdown to select correct category
2. Or create new category
3. Click "Save Override"
4. LLM learns from this correction

### Step 4: Analyze New Tweets
Next batch of tweets will benefit from your corrections!

---

## 💾 Database Schema

### tweets
- Raw Twitter data
- Fields: tweet_id, text, author, timestamp

### analysis
- AI categorization results
- Fields: suggested_category, final_category, confidence, urgency

### corrections
- PM overrides for learning
- Fields: original_category, corrected_category, tweet_text
- Used as few-shot examples in LLM prompts

---

## 🌐 Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

Your app will be live at:
```
https://feedback-analyzer-v2.YOUR-SUBDOMAIN.workers.dev
```

---

## 🧪 Testing the Learning Feature

### Test Scenario:
1. Analyze tweets (initial categorization)
2. Find a miscategorized tweet
3. Override it (e.g., "bug" → "deployment_issue")
4. Add a new similar tweet to database
5. Re-analyze
6. Verify new tweet is categorized correctly using your correction

---

## 📈 Metrics (Implicit)

While there's no dedicated metrics dashboard, you can track:
- **Total corrections**: Shows on dashboard
- **Category distribution**: Bar chart shows how feedback clusters
- **Recent corrections**: See which categories are being refined

---

## 🔧 Customization

### Change LLM Model
In `src/analyzer.ts`, line 52:
```typescript
await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
  // Use different model here
})
```

### Adjust Few-Shot Examples
In `src/analyzer.ts`, line 122:
```typescript
corrections.slice(0, 5)  // Change number of examples
```

### Modify Urgency Calculation
In `src/analyzer.ts`, `calculateUrgency()` method:
```typescript
if (lower.includes('broken')) urgency += 3;  // Adjust weights
```

---

## 🎓 Assignment Deliverables

### For Cloudflare PM Intern Assignment:

**1. Deployed URL**
```
https://feedback-analyzer-v2.YOUR-SUBDOMAIN.workers.dev
```

**2. GitHub Repository**
Push this code to GitHub and provide URL

**3. Architecture Screenshot**
- Cloudflare Dashboard → Workers & Pages → feedback-analyzer-v2
- Settings → Bindings
- Shows: D1 Database, Workers AI

**4. Architecture Description**
```
- Workers: Hosts application and API endpoints
- D1: Stores tweets (35 synthetic), analysis, PM corrections
- Workers AI: Auto-categorizes using Llama 3 with few-shot learning
  from PM corrections stored in D1

Learning Loop:
PM corrections → D1 corrections table → Few-shot examples in LLM prompts
→ Better categorization over time
```

---

## 📝 Key Features for Assignment

✅ **Solves Pain Points**:
- Unstructured data → Auto-categorization
- High volume → Bar chart aggregation
- Incorrect tagging → PM override
- Learning over time → Corrections as training data

✅ **Cloudflare Products** (3):
- Workers (required)
- D1 Database
- Workers AI

✅ **MCP Ready**:
- Can integrate Cloudflare Docs MCP for enhanced prompts
- Architecture supports MCP pipeline

✅ **Internal PM Tool**:
- Built for PM workflow
- Focus on actionable insights
- Learning from PM expertise

---

## 🐛 Troubleshooting

### "AI needs to be run remotely"
→ Use `npm run dev:remote` instead of `npm run dev`

### "Database not found"
→ Run `npm run setup-db` (local) or `npm run setup-db-remote` (cloud)

### Categories not updating after override
→ Refresh the page or click "Back to Dashboard"

### LLM suggesting poor categories
→ System needs more corrections to learn! Override 3-5 tweets to see improvement

---

## 🚀 Future Enhancements

- [ ] Batch tweet upload
- [ ] Export corrections as CSV
- [ ] A/B test different LLM prompts
- [ ] Track correction accuracy over time
- [ ] Multi-platform support (Discord, GitHub)
- [ ] Real-time Twitter ingestion

---

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)

---

**Built for Cloudflare Product Manager Intern Assignment (Summer 2026)**
