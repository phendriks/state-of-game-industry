export const REPORT_MODEL_CONFIG = {
  defaultModel: process.env.OPENAI_MODEL || 'gpt-6-luna',
  reasoningEffort: 'medium'
} as const;
