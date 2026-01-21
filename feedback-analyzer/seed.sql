-- Synthetic Twitter/X feedback for CloudflareDev
-- Diverse issues to test auto-categorization and PM overrides

-- Workers AI errors (high volume - similar issues)
INSERT INTO tweets (tweet_id, text, author, timestamp) VALUES
('t001', 'Workers AI keeps throwing 500 errors when using Llama model. Anyone else? @cloudflaredev', '@dev_sarah', datetime('now', '-5 days')),
('t002', 'Getting 500 errors with Workers AI Llama 3. Is there an outage?', '@ai_engineer', datetime('now', '-5 days')),
('t003', 'Workers AI Llama model completely broken. 500 errors everywhere', '@frustrated_dev', datetime('now', '-4 days')),
('t004', 'Same Llama error here. Workers AI returning 500s', '@backend_guy', datetime('now', '-4 days')),

-- D1 Database performance issues
('t005', 'D1 queries timing out in production. Blocking our launch! 😤', '@pm_alex', datetime('now', '-5 days')),
('t006', 'D1 database extremely slow today. Query timeouts', '@dba_jane', datetime('now', '-4 days')),
('t007', 'Anyone experiencing D1 performance issues? App is crawling', '@startup_cto', datetime('now', '-3 days')),

-- Documentation problems
('t008', 'Cloudflare dashboard UI is so cluttered. Cant find Workers AI section 😓', '@ux_critic', datetime('now', '-6 days')),
('t009', 'Documentation for Vectorize is scattered everywhere. Need one guide!', '@docs_reader', datetime('now', '-5 days')),
('t010', 'Onboarding is confusing. Took 2 hours to create first Worker', '@junior_dev', datetime('now', '-5 days')),
('t011', 'Error messages in wrangler CLI are cryptic. Use plain English!', '@cli_user', datetime('now', '-4 days')),
('t012', 'Code examples in docs use old syntax. They dont work', '@tutorial_fan', datetime('now', '-2 days')),

-- Pricing questions
('t013', 'How much does Workers AI cost for 1M requests? Pricing page is vague', '@budget_lead', datetime('now', '-6 days')),
('t014', 'Is D1 free tier enough for production?', '@startup_founder', datetime('now', '-4 days')),
('t015', 'Got surprise bill for Workers AI usage. Need cost alerts ⚠️', '@shocked_user', datetime('now', '-2 days')),

-- Feature requests
('t016', 'Please add GPT-4 support to Workers AI! Current models limiting', '@product_mgr', datetime('now', '-6 days')),
('t017', 'Need staging environment for D1. Testing in prod is risky 😅', '@devops_lead', datetime('now', '-4 days')),
('t018', 'Auto-scaling for D1 please! Manual capacity is painful', '@cloud_architect', datetime('now', '-2 days')),

-- Positive feedback
('t019', 'Workers AI is INCREDIBLE! Built sentiment analyzer in 30 mins 🔥', '@happy_builder', datetime('now', '-6 days')),
('t020', 'D1 performance is amazing. Queries 3x faster than Postgres!', '@perf_fan', datetime('now', '-5 days')),
('t021', 'Wrangler CLI is smooth. Love instant deploys ⚡', '@cli_lover', datetime('now', '-4 days')),

-- Configuration issues
('t022', 'Bindings in wrangler.toml keep getting ignored. Redeploy 5 times', '@config_admin', datetime('now', '-3 days')),
('t023', 'How do I pass secrets to Workers AI? Docs unclear on bindings', '@security_dev', datetime('now', '-3 days')),

-- Deployment problems
('t024', 'Workers deployment stuck at "Building..." for 20 minutes', '@deploy_jane', datetime('now', '-3 days')),
('t025', 'Wrangler deploy hanging. Third time today', '@impatient_user', datetime('now', '-2 days')),

-- Model selection confusion
('t026', 'Which AI model for classification? Too many options', '@confused_dev', datetime('now', '-2 days')),
('t027', 'Tried 3 Workers AI models, all errors. Need better examples', '@model_tester', datetime('now', '-2 days')),

-- Mixed feedback
('t028', 'Love Workers AI speed but dashboard confusing and docs outdated', '@mixed_user', datetime('now', '-3 days')),
('t029', 'D1 fast when it works, but random timeouts kill productivity', '@prod_user', datetime('now', '-2 days')),

-- Observability requests
('t030', 'Need real-time Workers AI usage monitoring. Observability tools?', '@monitoring_eng', datetime('now', '-1 day')),
('t031', 'Better logging for D1 queries would help debug performance', '@debug_dev', datetime('now', '-1 day')),

-- Scaling concerns
('t032', 'Can D1 handle 10M rows? Scaling concerns for enterprise', '@enterprise_arch', datetime('now', '-1 day')),
('t033', 'Workers AI rate limits unclear. How to plan for scale?', '@growth_eng', datetime('now', '-1 day')),

-- Integration questions
('t034', 'How to integrate Workers AI with existing Node.js backend?', '@integration_dev', datetime('now', '-2 days')),
('t035', 'Can I use D1 with Prisma ORM? Migration path unclear', '@orm_user', datetime('now', '-1 day'));
