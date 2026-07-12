export type AiInstructionLayer =
  | 'system'
  | 'product'
  | 'module'
  | 'agent'
  | 'tool'
  | 'output';

export type AiInstructionRecord = {
  id: number;
  slug: string;
  layer: AiInstructionLayer;
  name: string;
  content: string;
  variables_schema: Record<string, any> | null;
  locale: string;
  module_slug: string | null;
  is_active: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
};

export type AiExecutionTrigger = 'manual' | 'webhook' | 'schedule' | 'tool' | 'api';
export type AiExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';
export type AiExecutionStepType = 'prompt' | 'tool_call' | 'tool_result' | 'output' | 'error';

export type AiExecutionRecord = {
  id: number;
  user_id: number | null;
  conversation_id: number | null;
  agent_id: number | null;
  trigger: AiExecutionTrigger;
  status: AiExecutionStatus;
  context_slug: string | null;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  cost_usd: number;
  started_at: Date;
  finished_at: Date | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
};

export type AiExecutionStepRecord = {
  id: number;
  execution_id: number;
  step_order: number;
  type: AiExecutionStepType;
  provider: string | null;
  model: string | null;
  tool_name: string | null;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  duration_ms: number;
  input_summary: string | null;
  output_summary: string | null;
  success: boolean;
  error: string | null;
  created_at: Date;
};

export type AiModelPricingRecord = {
  id: number;
  provider: string;
  model: string;
  price_input_per_million: number;
  price_output_per_million: number;
  price_cached_input_per_million: number | null;
  is_active: boolean;
  valid_from: Date;
};

export type AiPromptBuildContext = {
  moduleSlug?: string;
  agentSlug?: string;
  locale?: string;
  userId?: number;
  extraVariables?: Record<string, string>;
};

export type AiTokenUsage = {
  input: number;
  output: number;
  total: number;
  cached?: number;
};
