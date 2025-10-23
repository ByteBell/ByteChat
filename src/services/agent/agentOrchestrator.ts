// Agent Orchestrator - coordinates planning and execution for browser automation

import { AgentPlanner, LLMProvider, ChromeExecutor, AgentPlan, PlanStep, StepResult } from 'bytechat-browser-agent';
import { callLLM } from '../../utils';
import { Settings } from '../../types';

/**
 * LLM Provider implementation using ByteChat's existing infrastructure
 */
class ByteChatLLMProvider implements LLMProvider {
  constructor(private settings: Settings) {}

  async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    console.log('[ByteChatLLMProvider] Generating completion');
    const response = await callLLM(this.settings, systemPrompt, userPrompt);
    return response;
  }
}

export type AgentRunMode = 'dryRun' | 'autoRun' | 'stepByStep';

export interface AgentRunConfig {
  goal: string;
  mode: AgentRunMode;
  settings: Settings;
  onStepUpdate?: (step: PlanStep, result: StepResult) => void;
  onPlanGenerated?: (plan: AgentPlan) => void;
}

export class AgentOrchestrator {
  private planner: AgentPlanner | null = null;
  private executor: ChromeExecutor;
  private currentPlan: AgentPlan | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.executor = new ChromeExecutor();
  }

  /**
   * Start an agent run
   */
  async startAgentRun(config: AgentRunConfig): Promise<void> {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }

    this.isRunning = true;

    try {
      console.log('[AgentOrchestrator] Starting agent run with goal:', config.goal);

      // Initialize planner with LLM provider
      const llmProvider = new ByteChatLLMProvider(config.settings);
      this.planner = new AgentPlanner(llmProvider);

      // Get page context
      const pageContext = await this.getPageContext();

      // Generate plan
      this.currentPlan = await this.planner.generatePlan(config.goal, pageContext);
      console.log('[AgentOrchestrator] Plan generated:', this.currentPlan);

      // Notify about generated plan
      if (config.onPlanGenerated) {
        config.onPlanGenerated(this.currentPlan);
      }

      // Execute based on mode
      if (config.mode === 'dryRun') {
        // Just return the plan without executing
        console.log('[AgentOrchestrator] Dry run completed - plan ready for review');
        return;
      }

      if (config.mode === 'autoRun') {
        // Execute all steps automatically
        await this.executePlan(config.onStepUpdate);
      }

      // stepByStep mode will be controlled by UI calling executeNextStep()

    } catch (error) {
      console.error('[AgentOrchestrator] Agent run failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute the entire plan
   */
  private async executePlan(onStepUpdate?: (step: PlanStep, result: StepResult) => void): Promise<void> {
    if (!this.currentPlan) {
      throw new Error('No plan to execute');
    }

    console.log('[AgentOrchestrator] Executing plan with', this.currentPlan.steps.length, 'steps');

    for (const step of this.currentPlan.steps) {
      const result = await this.executeStep(step);

      // Notify about step completion
      if (onStepUpdate) {
        onStepUpdate(step, result);
      }

      // Handle failures
      if (result.status === 'failed' && !step.optional) {
        console.warn('[AgentOrchestrator] Step failed:', step.id);

        // Try retry with alternate locators
        const retryResult = await this.executor.retryWithAlternate(step);

        if (onStepUpdate) {
          onStepUpdate(step, retryResult);
        }

        if (retryResult.status === 'failed') {
          throw new Error(`Step ${step.id} failed after retry: ${retryResult.details}`);
        }
      }

      // Add small delay between steps
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[AgentOrchestrator] Plan execution completed');
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: PlanStep): Promise<StepResult> {
    console.log(`[AgentOrchestrator] Executing step ${step.id}: ${step.action}`);
    return await this.executor.executeStep(step);
  }

  /**
   * Get the current plan
   */
  getCurrentPlan(): AgentPlan | null {
    return this.currentPlan;
  }

  /**
   * Cancel the current run
   */
  cancel(): void {
    this.isRunning = false;
    this.currentPlan = null;
    console.log('[AgentOrchestrator] Agent run cancelled');
  }

  /**
   * Get page context for better planning
   */
  private async getPageContext(): Promise<string> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (!tab) {
        return 'No active tab';
      }

      return `URL: ${tab.url}\nTitle: ${tab.title}`;
    } catch (error) {
      console.error('[AgentOrchestrator] Failed to get page context:', error);
      return '';
    }
  }
}
