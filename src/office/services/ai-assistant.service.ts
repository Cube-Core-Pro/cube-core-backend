// path: backend/src/office/services/ai-assistant.service.ts
// purpose: AI-powered writing assistant with smart suggestions, grammar check, and content generation
// dependencies: OpenAI API, natural language processing, content analysis

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import OpenAI from 'openai';

interface WritingSuggestion {
  type: 'grammar' | 'style' | 'clarity' | 'tone' | 'structure';
  severity: 'low' | 'medium' | 'high';
  position: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  original: string;
  suggestion: string;
  explanation: string;
  confidence: number;
}

interface ContentGeneration {
  type: 'paragraph' | 'bullet_points' | 'summary' | 'outline' | 'conclusion';
  prompt: string;
  context?: string;
  tone?: 'professional' | 'casual' | 'formal' | 'friendly' | 'persuasive';
  length?: 'short' | 'medium' | 'long';
}

interface SmartTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  variables: Array<{
    name: string;
    type: 'text' | 'number' | 'date' | 'select';
    required: boolean;
    options?: string[];
  }>;
  template: string;
}

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async analyzeWriting(
    tenantId: string,
    userId: string,
    content: string,
    documentType: 'DOCUMENT' | 'SPREADSHEET' | 'PRESENTATION',
    options: {
      checkGrammar?: boolean;
      checkStyle?: boolean;
      checkClarity?: boolean;
      checkTone?: boolean;
      targetAudience?: string;
      purpose?: string;
    } = {}
  ): Promise<WritingSuggestion[]> {
    try {
      const cacheKey = `ai:analysis:${tenantId}:${Buffer.from(content).toString('base64').slice(0, 32)}`;
      
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const suggestions: WritingSuggestion[] = [];

      // Grammar and spelling check
      if (options.checkGrammar !== false) {
        const grammarSuggestions = await this.checkGrammar(content);
        suggestions.push(...grammarSuggestions);
      }

      // Style and clarity analysis
      if (options.checkStyle !== false || options.checkClarity !== false) {
        const styleSuggestions = await this.analyzeStyle(content, options);
        suggestions.push(...styleSuggestions);
      }

      // Tone analysis
      if (options.checkTone !== false) {
        const toneSuggestions = await this.analyzeTone(content, options);
        suggestions.push(...toneSuggestions);
      }

      // Cache results for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(suggestions));

      // Log usage for analytics
      await this.logAiUsage(tenantId, userId, 'writing_analysis', {
        contentLength: content.length,
        suggestionsCount: suggestions.length,
        documentType,
      });

      return suggestions;

    } catch (error) {
      this.logger.error('Error analyzing writing:', error);
      throw new Error('Failed to analyze writing');
    }
  }

  async generateContent(
    tenantId: string,
    userId: string,
    request: ContentGeneration
  ): Promise<string> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API not configured');
      }

      const systemPrompt = this.buildSystemPrompt(request);
      const userPrompt = this.buildUserPrompt(request);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.getMaxTokens(request.length),
        temperature: 0.7,
      });

      const generatedContent = completion.choices[0]?.message?.content || '';

      // Log usage
      await this.logAiUsage(tenantId, userId, 'content_generation', {
        type: request.type,
        promptLength: request.prompt.length,
        generatedLength: generatedContent.length,
        tokensUsed: completion.usage?.total_tokens || 0,
      });

      return generatedContent;

    } catch (error) {
      this.logger.error('Error generating content:', error);
      throw new Error('Failed to generate content');
    }
  }

  async improveText(
    tenantId: string,
    userId: string,
    text: string,
    improvements: string[]
  ): Promise<string> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API not configured');
      }

      const systemPrompt = `You are a professional writing assistant. Improve the given text based on the requested improvements: ${improvements.join(', ')}. Maintain the original meaning and structure while enhancing clarity, style, and impact.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please improve this text:\n\n${text}` }
        ],
        max_tokens: Math.max(text.length * 2, 500),
        temperature: 0.3,
      });

      const improvedText = completion.choices[0]?.message?.content || text;

      await this.logAiUsage(tenantId, userId, 'text_improvement', {
        originalLength: text.length,
        improvedLength: improvedText.length,
        improvements,
      });

      return improvedText;

    } catch (error) {
      this.logger.error('Error improving text:', error);
      throw new Error('Failed to improve text');
    }
  }

  async generateSmartTemplate(
    tenantId: string,
    userId: string,
    description: string,
    documentType: 'DOCUMENT' | 'SPREADSHEET' | 'PRESENTATION'
  ): Promise<SmartTemplate> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API not configured');
      }

      const systemPrompt = `You are a template generation expert. Create a smart template based on the description. Return a JSON object with: id, name, category, description, variables (array of {name, type, required, options}), and template (with {{variable}} placeholders).`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a ${documentType.toLowerCase()} template for: ${description}` }
        ],
        max_tokens: 2000,
        temperature: 0.5,
      });

      const templateData = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      const smartTemplate: SmartTemplate = {
        id: `smart_${Date.now()}`,
        name: templateData.name || 'Generated Template',
        category: templateData.category || 'AI Generated',
        description: templateData.description || description,
        variables: templateData.variables || [],
        template: templateData.template || '',
      };

      await this.logAiUsage(tenantId, userId, 'template_generation', {
        description,
        documentType,
        variablesCount: smartTemplate.variables.length,
      });

      return smartTemplate;

    } catch (error) {
      this.logger.error('Error generating smart template:', error);
      throw new Error('Failed to generate smart template');
    }
  }

  async summarizeDocument(
    tenantId: string,
    userId: string,
    content: any,
    length: 'short' | 'medium' | 'long' = 'medium'
  ): Promise<string> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API not configured');
      }

      const textContent = this.extractTextFromContent(content);
      const maxLength = length === 'short' ? 100 : length === 'medium' ? 300 : 500;

      const systemPrompt = `You are a professional document summarizer. Create a ${length} summary that captures the key points and main ideas. Maximum ${maxLength} words.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Summarize this document:\n\n${textContent}` }
        ],
        max_tokens: maxLength * 2,
        temperature: 0.3,
      });

      const summary = completion.choices[0]?.message?.content || '';

      await this.logAiUsage(tenantId, userId, 'document_summary', {
        originalLength: textContent.length,
        summaryLength: summary.length,
        summaryType: length,
      });

      return summary;

    } catch (error) {
      this.logger.error('Error summarizing document:', error);
      throw new Error('Failed to summarize document');
    }
  }

  async translateContent(
    tenantId: string,
    userId: string,
    content: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API not configured');
      }

      const systemPrompt = `You are a professional translator. Translate the given text to ${targetLanguage}${sourceLanguage ? ` from ${sourceLanguage}` : ''}. Maintain the original formatting, tone, and meaning. Preserve any technical terms appropriately.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        max_tokens: content.length * 2,
        temperature: 0.3,
      });

      const translation = completion.choices[0]?.message?.content || '';

      await this.logAiUsage(tenantId, userId, 'translation', {
        originalLength: content.length,
        translatedLength: translation.length,
        targetLanguage,
        sourceLanguage,
      });

      return translation;

    } catch (error) {
      this.logger.error('Error translating content:', error);
      throw new Error('Failed to translate content');
    }
  }

  async getWritingInsights(
    tenantId: string,
    userId: string,
    content: string
  ): Promise<{
    readabilityScore: number;
    wordCount: number;
    sentenceCount: number;
    averageWordsPerSentence: number;
    readingTime: number;
    tone: string;
    complexity: 'simple' | 'moderate' | 'complex';
    suggestions: string[];
  }> {
    try {
      const words = content.split(/\s+/).filter(word => word.length > 0);
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      const wordCount = words.length;
      const sentenceCount = sentences.length;
      const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
      const readingTime = Math.ceil(wordCount / 200); // Average reading speed

      // Simple readability calculation (Flesch-like)
      const avgSentenceLength = averageWordsPerSentence;
      const avgSyllables = this.estimateAverageSyllables(words);
      const readabilityScore = Math.max(0, Math.min(100, 
        206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllables)
      ));

      const complexity = readabilityScore > 70 ? 'simple' : 
                        readabilityScore > 50 ? 'moderate' : 'complex';

      // AI-powered tone and suggestions
      let tone = 'neutral';
      let suggestions: string[] = [];

      if (this.openai) {
        try {
          const analysis = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'Analyze the tone of the text and provide 3 brief writing suggestions. Return JSON: {"tone": "...", "suggestions": ["...", "...", "..."]}'
              },
              { role: 'user', content: content.slice(0, 1000) }
            ],
            max_tokens: 200,
            temperature: 0.3,
          });

          const result = JSON.parse(analysis.choices[0]?.message?.content || '{}');
          tone = result.tone || 'neutral';
          suggestions = result.suggestions || [];
        } catch (aiError) {
          this.logger.warn('AI analysis failed, using basic analysis');
        }
      }

      return {
        readabilityScore: Math.round(readabilityScore),
        wordCount,
        sentenceCount,
        averageWordsPerSentence: Math.round(averageWordsPerSentence * 10) / 10,
        readingTime,
        tone,
        complexity,
        suggestions,
      };

    } catch (error) {
      this.logger.error('Error getting writing insights:', error);
      throw new Error('Failed to analyze writing insights');
    }
  }

  private async checkGrammar(content: string): Promise<WritingSuggestion[]> {
    // Advanced grammar checking with comprehensive pattern recognition
    const suggestions: WritingSuggestion[] = [];
    
    // Comprehensive grammar patterns
    const patterns = [
      // Homophones and commonly confused words
      {
        regex: /\b(there|their|they're)\b/gi,
        check: (match: string, context: string) => {
          const word = match.toLowerCase();
          const beforeContext = context.substring(0, context.indexOf(match));
          const afterContext = context.substring(context.indexOf(match) + match.length);
          
          // "There" - location or existence
          if (word === 'there' && (/\s+(is|are|was|were)\s+/.test(afterContext) || /over\s+$/.test(beforeContext))) {
            return null; // Correct usage
          }
          
          // "Their" - possessive
          if (word === 'their' && /\s+\w+\s+(is|are|was|were)/.test(afterContext)) {
            return null; // Correct usage
          }
          
          // "They're" - contraction
          if (word === "they're" && (/\s+(going|coming|being)/.test(afterContext) || /\s+(very|really|quite)/.test(afterContext))) {
            return null; // Correct usage
          }
          
          return {
            type: 'grammar' as const,
            severity: 'medium' as const,
            suggestion: this.getThereTheirTheyreSuggestion(word, beforeContext, afterContext),
            explanation: 'Common confusion: "there" (location/existence), "their" (possessive), "they\'re" (they are)',
            confidence: 0.8,
          };
        }
      },
      
      // Its vs It's
      {
        regex: /\b(its|it's)\b/gi,
        check: (match: string, context: string) => {
          const word = match.toLowerCase();
          const afterContext = context.substring(context.indexOf(match) + match.length);
          
          if (word === "it's" && !/\s+(a|an|the|very|really|quite|been|going)/.test(afterContext)) {
            return {
              type: 'grammar' as const,
              severity: 'medium' as const,
              suggestion: 'Consider using "its" for possession',
              explanation: '"It\'s" is a contraction for "it is" or "it has". Use "its" for possession.',
              confidence: 0.8,
            };
          }
          
          if (word === "its" && /\s+(a|an|the|very|really|quite|been|going)/.test(afterContext)) {
            return {
              type: 'grammar' as const,
              severity: 'medium' as const,
              suggestion: 'Consider using "it\'s" as a contraction',
              explanation: 'Use "it\'s" when you mean "it is" or "it has"',
              confidence: 0.7,
            };
          }
          
          return null;
        }
      },
      
      // Your vs You're
      {
        regex: /\b(your|you're)\b/gi,
        check: (match: string, context: string) => {
          const word = match.toLowerCase();
          const afterContext = context.substring(context.indexOf(match) + match.length);
          
          if (word === "you're" && /\s+\w+\s+(is|are|was|were)/.test(afterContext)) {
            return {
              type: 'grammar' as const,
              severity: 'medium' as const,
              suggestion: 'Consider using "your" for possession',
              explanation: '"You\'re" means "you are". Use "your" for possession.',
              confidence: 0.8,
            };
          }
          
          if (word === "your" && /\s+(going|coming|being|very|really|quite)/.test(afterContext)) {
            return {
              type: 'grammar' as const,
              severity: 'medium' as const,
              suggestion: 'Consider using "you\'re" as a contraction',
              explanation: 'Use "you\'re" when you mean "you are"',
              confidence: 0.7,
            };
          }
          
          return null;
        }
      },
      
      // Subject-verb agreement
      {
        regex: /\b(is|are)\b/gi,
        check: (match: string, context: string) => {
          const verb = match.toLowerCase();
          const beforeContext = context.substring(0, context.indexOf(match));
          const subjectMatch = beforeContext.match(/\b(he|she|it|this|that|everyone|someone|nobody|each)\s*$/i);
          
          if (subjectMatch && verb === 'are') {
            return {
              type: 'grammar' as const,
              severity: 'high' as const,
              suggestion: `Use "is" with singular subject "${subjectMatch[1]}"`,
              explanation: 'Singular subjects require singular verbs',
              confidence: 0.9,
            };
          }
          
          const pluralMatch = beforeContext.match(/\b(they|we|these|those|people|children)\s*$/i);
          if (pluralMatch && verb === 'is') {
            return {
              type: 'grammar' as const,
              severity: 'high' as const,
              suggestion: `Use "are" with plural subject "${pluralMatch[1]}"`,
              explanation: 'Plural subjects require plural verbs',
              confidence: 0.9,
            };
          }
          
          return null;
        }
      },
      
      // Double negatives
      {
        regex: /\b(don't|doesn't|didn't|won't|can't|shouldn't|wouldn't|couldn't)\s+\w*\s*(no|nothing|nobody|never|nowhere)\b/gi,
        check: (match: string) => {
          return {
            type: 'grammar' as const,
            severity: 'medium' as const,
            suggestion: 'Avoid double negatives',
            explanation: 'Double negatives can be confusing. Use either the negative verb or the negative word, not both.',
            confidence: 0.8,
          };
        }
      },
      
      // Sentence fragments
      {
        regex: /\b(Because|Since|Although|While|If|When|Before|After)\s+[^.!?]*[.!?]/gi,
        check: (match: string) => {
          // Check if it's a complete sentence or fragment
          const hasMainClause = /\b(is|are|was|were|have|has|had|do|does|did|will|would|can|could|should|may|might)\b/i.test(match);
          
          if (!hasMainClause) {
            return {
              type: 'grammar' as const,
              severity: 'medium' as const,
              suggestion: 'This appears to be a sentence fragment',
              explanation: 'Sentences starting with subordinating conjunctions need a main clause',
              confidence: 0.7,
            };
          }
          
          return null;
        }
      },
      
      // Comma splices
      {
        regex: /[a-z]\s*,\s*[a-z][^,]*\b(is|are|was|were|have|has|had|do|does|did|will|would)\b/gi,
        check: (match: string) => {
          return {
            type: 'grammar' as const,
            severity: 'medium' as const,
            suggestion: 'Possible comma splice - consider using a semicolon or period',
            explanation: 'Two independent clauses should not be joined by just a comma',
            confidence: 0.6,
          };
        }
      },
      
      // Apostrophe errors in plurals
      {
        regex: /\b\w+'s\b/gi,
        check: (match: string, context: string) => {
          const word = match.toLowerCase();
          const afterContext = context.substring(context.indexOf(match) + match.length);
          
          // Check if it's likely a plural that shouldn't have an apostrophe
          if (/\s+(are|were|have|many|several|few|some|all)\b/i.test(afterContext)) {
            return {
              type: 'grammar' as const,
              severity: 'medium' as const,
              suggestion: 'Check if this should be a plural without an apostrophe',
              explanation: 'Apostrophes are for possession or contractions, not plurals',
              confidence: 0.7,
            };
          }
          
          return null;
        }
      },
      
      // Dangling modifiers
      {
        regex: /^(Walking|Running|Driving|Looking|Thinking|Considering|After|Before|While)\s+[^,]*,\s*\w+/gmi,
        check: (match: string) => {
          // Simple check for potential dangling modifiers
          const parts = match.split(',');
          if (parts.length === 2) {
            const modifier = parts[0].trim();
            const mainClause = parts[1].trim();
            
            // Check if the subject of the main clause can logically perform the action in the modifier
            if (!/\b(I|we|he|she|they|the\s+\w+)\b/i.test(mainClause)) {
              return {
                type: 'grammar' as const,
                severity: 'low' as const,
                suggestion: 'Check for dangling modifier',
                explanation: 'Make sure the subject of the sentence can logically perform the action in the modifier',
                confidence: 0.5,
              };
            }
          }
          
          return null;
        }
      }
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        const context = content.slice(Math.max(0, match.index - 50), match.index + 50);
        const suggestion = pattern.check(match[0], context);
        
        if (suggestion) {
          suggestions.push({
            ...suggestion,
            position: {
              start: match.index,
              end: match.index + match[0].length,
            },
            original: match[0],
          });
        }
      }
    }

    return suggestions;
  }

  private async analyzeStyle(content: string, _options: any): Promise<WritingSuggestion[]> {
    const suggestions: WritingSuggestion[] = [];

    // Passive voice detection
    const passivePattern = /\b(was|were|is|are|been|being)\s+\w+ed\b/gi;
    let match;
    while ((match = passivePattern.exec(content)) !== null) {
      suggestions.push({
        type: 'style',
        severity: 'low',
        position: { start: match.index, end: match.index + match[0].length },
        original: match[0],
        suggestion: 'Consider using active voice',
        explanation: 'Active voice is often clearer and more engaging',
        confidence: 0.6,
      });
    }

    // Long sentences
    const sentences = content.split(/[.!?]+/);
    let position = 0;
    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 25) {
        suggestions.push({
          type: 'clarity',
          severity: 'medium',
          position: { start: position, end: position + sentence.length },
          original: sentence.trim(),
          suggestion: 'Consider breaking this long sentence into shorter ones',
          explanation: 'Shorter sentences improve readability',
          confidence: 0.8,
        });
      }
      position += sentence.length + 1;
    }

    return suggestions;
  }

  private async analyzeTone(content: string, options: any): Promise<WritingSuggestion[]> {
    const suggestions: WritingSuggestion[] = [];

    // Basic tone analysis patterns
    const _formalWords = /\b(utilize|commence|terminate|facilitate)\b/gi;
    const casualWords = /\b(gonna|wanna|kinda|sorta)\b/gi;

    if (options.targetAudience === 'professional' && casualWords.test(content)) {
      suggestions.push({
        type: 'tone',
        severity: 'medium',
        position: { start: 0, end: content.length },
        original: content,
        suggestion: 'Consider using more formal language for professional audience',
        explanation: 'Professional documents benefit from formal tone',
        confidence: 0.7,
      });
    }

    return suggestions;
  }

  private buildSystemPrompt(request: ContentGeneration): string {
    const basePrompt = 'You are a professional writing assistant.';
    
    switch (request.type) {
      case 'paragraph':
        return `${basePrompt} Write a well-structured paragraph based on the user's request.`;
      case 'bullet_points':
        return `${basePrompt} Create clear, concise bullet points based on the user's request.`;
      case 'summary':
        return `${basePrompt} Create a comprehensive summary based on the user's request.`;
      case 'outline':
        return `${basePrompt} Create a detailed outline with main points and sub-points.`;
      case 'conclusion':
        return `${basePrompt} Write a strong conclusion that summarizes key points.`;
      default:
        return basePrompt;
    }
  }

  private buildUserPrompt(request: ContentGeneration): string {
    let prompt = request.prompt;
    
    if (request.context) {
      prompt += `\n\nContext: ${request.context}`;
    }
    
    if (request.tone) {
      prompt += `\n\nTone: ${request.tone}`;
    }
    
    if (request.length) {
      prompt += `\n\nLength: ${request.length}`;
    }
    
    return prompt;
  }

  private getMaxTokens(length?: string): number {
    switch (length) {
      case 'short': return 200;
      case 'medium': return 500;
      case 'long': return 1000;
      default: return 500;
    }
  }

  private extractTextFromContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (content?.type === 'doc' && content?.content) {
      return this.extractTextFromProseMirror(content.content);
    }
    
    return JSON.stringify(content);
  }

  private extractTextFromProseMirror(content: any[]): string {
    let text = '';
    
    for (const node of content) {
      if (node.type === 'text') {
        text += node.text || '';
      } else if (node.content) {
        text += this.extractTextFromProseMirror(node.content);
      }
      text += ' ';
    }
    
    return text.trim();
  }

  private estimateAverageSyllables(words: string[]): number {
    let totalSyllables = 0;
    
    for (const word of words) {
      // Simple syllable estimation
      const syllables = word.toLowerCase()
        .replace(/[^a-z]/g, '')
        .replace(/e$/, '')
        .match(/[aeiouy]+/g)?.length || 1;
      totalSyllables += Math.max(1, syllables);
    }
    
    return words.length > 0 ? totalSyllables / words.length : 1;
  }

  private async logAiUsage(
    tenantId: string,
    userId: string,
    operation: string,
    metadata: any
  ): Promise<void> {
    try {
      // Log to analytics/audit system
      const logEntry = {
        tenantId,
        userId,
        operation,
        metadata,
        timestamp: new Date(),
      };

      // Store in Redis for real-time analytics
      await this.redis.lpush(
        `ai:usage:${tenantId}`,
        JSON.stringify(logEntry)
      );

      // Keep only last 1000 entries
      await this.redis.ltrim(`ai:usage:${tenantId}`, 0, 999);

    } catch (error) {
      this.logger.error('Error logging AI usage:', error);
    }
  }

  private getThereTheirTheyreSuggestion(word: string, beforeContext: string, afterContext: string): string {
    // Analyze context to provide specific suggestion
    const beforeWords = beforeContext.toLowerCase().split(/\s+/).slice(-3);
    const afterWords = afterContext.toLowerCase().split(/\s+/).slice(0, 3);
    
    // Check for location indicators
    if (beforeWords.some(w => ['over', 'go', 'put', 'place', 'look'].includes(w)) || 
        afterWords.some(w => ['is', 'are', 'was', 'were'].includes(w))) {
      return 'Use "there" for location or existence (there is/are)';
    }
    
    // Check for possession indicators
    if (afterWords.some(w => ['house', 'car', 'book', 'idea', 'plan', 'work'].includes(w))) {
      return 'Use "their" for possession (belonging to them)';
    }
    
    // Check for contraction indicators
    if (afterWords.some(w => ['going', 'coming', 'being', 'very', 'really', 'quite'].includes(w))) {
      return 'Use "they\'re" as a contraction for "they are"';
    }
    
    // Default suggestion based on current word
    switch (word.toLowerCase()) {
      case 'there':
        return 'Check if you meant "their" (possession) or "they\'re" (they are)';
      case 'their':
        return 'Check if you meant "there" (location/existence) or "they\'re" (they are)';
      case "they're":
        return 'Check if you meant "there" (location/existence) or "their" (possession)';
      default:
        return 'Check the correct usage: "there" (location), "their" (possession), "they\'re" (they are)';
    }
  }
}