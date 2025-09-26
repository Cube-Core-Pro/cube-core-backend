import { Injectable } from '@nestjs/common';

export interface ModerationResult {
  flagged: boolean;
  confidence: number;
  categories: Array<{
    name: string;
    score: number;
  }>;
  recommendedAction: 'allow' | 'review' | 'block';
  rationale: string[];
}

@Injectable()
export class AiModerationService {
  private readonly profanityList = new Set(['spam', 'scam', 'fraud', 'abuse']);

  analyzeChatMessage(message: string): ModerationResult {
    const normalized = message.toLowerCase();
    const categories = [
      this.scoreProfanity(normalized),
      this.scoreSpam(normalized),
      this.scoreHarassment(normalized),
    ].filter((category) => category.score > 0);

    const topScore = categories.reduce((max, category) => Math.max(max, category.score), 0);
    const flagged = topScore >= 0.6;
    const confidence = topScore ? Number(topScore.toFixed(2)) : 0;
    const rationale = categories
      .filter((category) => category.score >= 0.3)
      .map((category) => `Detected ${category.name} indicators (score: ${category.score.toFixed(2)})`);

    const recommendedAction: ModerationResult['recommendedAction'] = flagged
      ? 'block'
      : confidence >= 0.3
        ? 'review'
        : 'allow';

    return {
      flagged,
      confidence,
      categories,
      recommendedAction,
      rationale,
    };
  }

  private scoreProfanity(message: string) {
    let matches = 0;
    for (const word of this.profanityList) {
      if (message.includes(word)) {
        matches += 1;
      }
    }
    const score = Math.min(1, matches * 0.4);
    return { name: 'profanity', score };
  }

  private scoreSpam(message: string) {
    let score = 0;
    if (/(https?:\/\/|www\.)/.test(message)) {
      score += 0.4;
    }
    if (/(buy now|limited offer|click here)/.test(message)) {
      score += 0.4;
    }
    return { name: 'spam', score: Math.min(score, 1) };
  }

  private scoreHarassment(message: string) {
    const negativePhrases = ['hate you', 'stupid', 'idiot', 'shut up'];
    const hits = negativePhrases.filter((phrase) => message.includes(phrase)).length;
    return { name: 'harassment', score: Math.min(1, hits * 0.35) };
  }
}
