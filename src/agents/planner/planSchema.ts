// Plan schema for browser automation agent
// Inspired by browser-use but adapted for Chrome extension execution

export interface LocatorStrategy {
  type: 'text' | 'role' | 'aria' | 'css' | 'xpath' | 'placeholder' | 'name';
  value: string;
  priority: number; // Lower = higher priority
}

export interface ActionTarget {
  strategies: LocatorStrategy[];
  textOrLabel?: string;
  selector?: string;
  description?: string; // Human-readable description of the target
}

export type ActionType =
  | 'goTo'        // Navigate to URL
  | 'click'       // Click element
  | 'type'        // Type text into input
  | 'select'      // Select dropdown option
  | 'submit'      // Submit form
  | 'scroll'      // Scroll to element or position
  | 'wait'        // Wait for element or timeout
  | 'extract'     // Extract data from page
  | 'hover'       // Hover over element
  | 'check'       // Check checkbox
  | 'uncheck';    // Uncheck checkbox

export interface PlanStep {
  id: string;
  action: ActionType;
  target?: ActionTarget;
  value?: string;
  description: string;
  timeoutMs?: number;
  optional?: boolean; // If true, continue even if step fails
}

export interface AgentPlan {
  goal: string;
  steps: PlanStep[];
  constraints: {
    stayOnDomain: boolean;
    maxSteps: number;
    allowDownloads: boolean;
    allowNavigation: boolean;
  };
  metadata?: {
    estimatedDuration?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    requiresAuth?: boolean;
  };
}

export type StepStatus = 'pending' | 'running' | 'success' | 'retry' | 'failed' | 'skipped';

export interface StepResult {
  stepId: string;
  status: StepStatus;
  details: string;
  extracted?: any;
  snapshotId?: string;
  error?: string;
  timestamp: number;
  retryCount?: number;
}

export interface AgentRunResult {
  planId: string;
  goal: string;
  status: 'completed' | 'failed' | 'cancelled';
  steps: StepResult[];
  extractedData?: any[];
  startTime: number;
  endTime: number;
  totalDuration: number;
}
