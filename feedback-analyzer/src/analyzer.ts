// AI Analyzer that learns from PM corrections

import { Env, Correction } from './types';

export class AIAnalyzer {
  constructor(private env: Env) {}

  /**
   * Analyze tweet and suggest category
   * Uses past PM corrections as few-shot examples
   */
  async analyzeTweet(text: string): Promise<{
    suggested_category: string;
    confidence_score: number;
    urgency_score: number;
  }> {
    const category = await this.suggestCategory(text);
    const urgency = this.calculateUrgency(text);

    return {
      suggested_category: category.category,
      confidence_score: category.confidence,
      urgency_score: urgency
    };
  }

  /**
   * Suggest category using LLM with few-shot learning from corrections
   */
  private async suggestCategory(text: string): Promise<{ category: string; confidence: number }> {
    // Check if AI is available (remote mode)
    if (!this.env.AI) {
      console.log('Local mode: using keyword-based categorization');
      return this.keywordCategorize(text);
    }

    try {
      // Get recent PM corrections for few-shot learning
      const corrections = await this.getRecentCorrections();
      
      // Build prompt with examples from corrections
      const prompt = this.buildPromptWithExamples(text, corrections);

      // Use Workers AI
      const response = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
        prompt: prompt,
        max_tokens: 30
      });

      // Parse and clean response
      const category = this.parseCategory(response.response);
      
      return {
        category: category,
        confidence: 0.8
      };

    } catch (error) {
      console.log('LLM failed, using keyword fallback:', error);
      return this.keywordCategorize(text);
    }
  }

  /**
   * Build LLM prompt with few-shot examples from PM corrections
   */
  private buildPromptWithExamples(text: string, corrections: Correction[]): string {
    let prompt = `You are categorizing product feedback tweets. Suggest ONE specific category.

Examples of good categories: api_error, slow_performance, unclear_docs, pricing_concern, feature_request, positive_feedback, deployment_issue, configuration_problem.

`;

    // Add few-shot examples from PM corrections
    if (corrections.length > 0) {
      prompt += `Here are examples of correct categorizations:\n\n`;
      
      corrections.slice(0, 5).forEach((correction, idx) => {
        prompt += `Tweet: "${correction.tweet_text}"
Category: ${correction.corrected_category}

`;
      });
    }

    prompt += `Now categorize this tweet:
Tweet: "${text}"

Respond with ONLY the category name (lowercase, underscores for spaces).
Category:`;

    return prompt;
  }

  /**
   * Get recent PM corrections for learning
   */
  private async getRecentCorrections(): Promise<Correction[]> {
    try {
      const result = await this.env.DB.prepare(`
        SELECT tweet_text, corrected_category
        FROM corrections
        ORDER BY corrected_at DESC
        LIMIT 5
      `).all();

      return (result.results || []) as Correction[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse LLM response to extract category
   */
  private parseCategory(response: string): string {
    // Clean response
    const cleaned = response.trim().toLowerCase()
      .replace(/category:/gi, '')
      .replace(/['"]/g, '')
      .replace(/\n.*$/g, '')  // Remove everything after first newline
      .trim();

    // Take first word/phrase
    const words = cleaned.split(/\s+/);
    const category = words.slice(0, 2).join('_');  // Max 2 words

    return category || 'uncategorized';
  }

  /**
   * Keyword-based categorization (fallback for local mode)
   */
  private keywordCategorize(text: string): { category: string; confidence: number } {
    const lower = text.toLowerCase();
    
    // API/System errors
    if (lower.includes('500') || lower.includes('error') || lower.includes('crash') || lower.includes('broken') || lower.includes('fail')) {
      return { category: 'api_error', confidence: 0.75 };
    }
    
    // Performance issues
    if (lower.includes('slow') || lower.includes('timeout') || lower.includes('performance') || lower.includes('crawling')) {
      return { category: 'slow_performance', confidence: 0.75 };
    }
    
    // Documentation
    if (lower.includes('docs') || lower.includes('documentation') || lower.includes('example') || lower.includes('guide') || lower.includes('unclear')) {
      return { category: 'unclear_docs', confidence: 0.75 };
    }
    
    // UI/UX
    if (lower.includes('dashboard') || lower.includes('ui') || lower.includes('ux') || lower.includes('confusing') || lower.includes('cluttered')) {
      return { category: 'ux_issue', confidence: 0.75 };
    }
    
    // Pricing
    if (lower.includes('price') || lower.includes('cost') || lower.includes('bill') || lower.includes('tier')) {
      return { category: 'pricing_concern', confidence: 0.75 };
    }
    
    // Feature requests
    if (lower.includes('please add') || lower.includes('would love') || lower.includes('need') || lower.includes('request')) {
      return { category: 'feature_request', confidence: 0.75 };
    }
    
    // Positive
    if (lower.includes('love') || lower.includes('amazing') || lower.includes('incredible') || lower.includes('🔥') || lower.includes('⚡')) {
      return { category: 'positive_feedback', confidence: 0.75 };
    }
    
    // Deployment
    if (lower.includes('deploy') || lower.includes('build') || lower.includes('wrangler')) {
      return { category: 'deployment_issue', confidence: 0.75 };
    }
    
    // Configuration
    if (lower.includes('binding') || lower.includes('config') || lower.includes('secret')) {
      return { category: 'configuration_problem', confidence: 0.75 };
    }
    
    // Scaling/Enterprise
    if (lower.includes('scale') || lower.includes('enterprise') || lower.includes('million')) {
      return { category: 'scaling_concern', confidence: 0.75 };
    }

    return { category: 'general_feedback', confidence: 0.6 };
  }

  /**
   * Calculate urgency score (1-10)
   */
  private calculateUrgency(text: string): number {
    let urgency = 5;
    const lower = text.toLowerCase();

    // Critical keywords
    if (lower.includes('broken') || lower.includes('crash') || lower.includes('down') || lower.includes('blocking')) {
      urgency += 3;
    }
    
    // High priority
    if (lower.includes('error') || lower.includes('500') || lower.includes('timeout') || lower.includes('fail')) {
      urgency += 2;
    }
    
    // Medium priority
    if (lower.includes('slow') || lower.includes('issue') || lower.includes('problem')) {
      urgency += 1;
    }
    
    // Emotional indicators
    if (text.includes('😤') || text.includes('😓') || text.includes('⚠️')) {
      urgency += 1;
    }
    
    // Positive feedback = low urgency
    if (lower.includes('love') || lower.includes('amazing') || lower.includes('incredible')) {
      urgency = Math.max(2, urgency - 2);
    }

    return Math.min(urgency, 10);
  }
}
