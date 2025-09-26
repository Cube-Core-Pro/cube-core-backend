import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type ToolType = 'poll' | 'quiz' | 'survey';

export interface PollOption {
  optionId: string;
  label: string;
  votes: number;
}

export interface InteractiveTool {
  toolId: string;
  sessionId: string;
  createdBy: string;
  type: ToolType;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  closesAt?: string;
}

export interface VoteInput {
  optionIds: string[];
  participantId: string;
}

interface VoteRegistry {
  [participantId: string]: string[];
}

interface ToolState extends InteractiveTool {
  votes: VoteRegistry;
}

@Injectable()
export class InteractiveToolsService {
  private readonly tools = new Map<string, ToolState>();

  createTool(
    sessionId: string,
    createdBy: string,
    input: {
      type: ToolType;
      question: string;
      options: Array<{ label: string }>;
      allowMultiple?: boolean;
      isAnonymous?: boolean;
      closesAt?: string;
    },
  ): InteractiveTool {
    const now = new Date().toISOString();
    const toolId = randomUUID();
    const tool: ToolState = {
      toolId,
      sessionId,
      createdBy,
      type: input.type,
      question: input.question,
      options: input.options.map((option) => ({
        optionId: randomUUID(),
        label: option.label,
        votes: 0,
      })),
      allowMultiple: Boolean(input.allowMultiple),
      isAnonymous: Boolean(input.isAnonymous ?? true),
      closesAt: input.closesAt,
      createdAt: now,
      updatedAt: now,
      votes: {},
    };

    this.tools.set(toolId, tool);
    return this.toPublic(tool);
  }

  vote(toolId: string, vote: VoteInput) {
    const tool = this.requireTool(toolId);

    if (tool.closesAt && new Date(tool.closesAt).valueOf() < Date.now()) {
      throw new NotFoundException(`Tool ${toolId} is closed for voting`);
    }

    const uniqueOptionIds = Array.from(new Set(vote.optionIds));
    const validOptions = tool.options.filter((option) => uniqueOptionIds.includes(option.optionId));

    if (!validOptions.length) {
      throw new NotFoundException('No valid options provided');
    }

    if (!tool.allowMultiple && validOptions.length > 1) {
      validOptions.splice(1);
    }

    const previousVotes = tool.votes[vote.participantId] ?? [];
    for (const option of tool.options) {
      if (previousVotes.includes(option.optionId)) {
        option.votes = Math.max(0, option.votes - 1);
      }
    }

    tool.votes[vote.participantId] = validOptions.map((option) => option.optionId);
    for (const option of validOptions) {
      option.votes += 1;
    }

    tool.updatedAt = new Date().toISOString();
    return this.toPublic(tool);
  }

  closeTool(toolId: string) {
    const tool = this.requireTool(toolId);
    tool.closesAt = new Date().toISOString();
    tool.updatedAt = tool.closesAt;
    return this.toPublic(tool);
  }

  getTool(toolId: string): InteractiveTool {
    return this.toPublic(this.requireTool(toolId));
  }

  listToolsBySession(sessionId: string): InteractiveTool[] {
    return Array.from(this.tools.values())
      .filter((tool) => tool.sessionId === sessionId)
      .map((tool) => this.toPublic(tool));
  }

  getResults(toolId: string) {
    const tool = this.requireTool(toolId);
    const totalVotes = tool.options.reduce((sum, option) => sum + option.votes, 0);
    return {
      tool: this.toPublic(tool),
      totalVotes,
      options: tool.options.map((option) => ({
        optionId: option.optionId,
        label: option.label,
        votes: option.votes,
        percentage: totalVotes ? Number(((option.votes / totalVotes) * 100).toFixed(2)) : 0,
      })),
    };
  }

  getActiveToolCount(): number {
    let count = 0;
    const now = Date.now();
    for (const tool of this.tools.values()) {
      if (!tool.closesAt || new Date(tool.closesAt).valueOf() > now) {
        count += 1;
      }
    }
    return count;
  }

  private requireTool(toolId: string): ToolState {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new NotFoundException(`Interactive tool ${toolId} not found`);
    }
    return tool;
  }

  private toPublic(tool: ToolState): InteractiveTool {
    return {
      toolId: tool.toolId,
      sessionId: tool.sessionId,
      createdBy: tool.createdBy,
      type: tool.type,
      question: tool.question,
      options: tool.options.map((option) => ({ ...option })),
      allowMultiple: tool.allowMultiple,
      isAnonymous: tool.isAnonymous,
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt,
      closesAt: tool.closesAt,
    };
  }
}
