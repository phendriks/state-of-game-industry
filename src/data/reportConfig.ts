export const REPORT_MODEL_CONFIG = {
  defaultModel: process.env.OPENAI_MODEL || 'gpt-6-luna',
  reasoningEffort: 'medium'
} as const;

export const REPORT_WRITING_RULES = `Write for a data dashboard reader checking for a quick update.
Start with one plain-text summary paragraph of at most 45 words: what changed and why it matters.
Then give each selected finding at most two short sentences and 35 words. Use a compact changes table only when it adds information.
Keep the entire report body under 250 words. Use fewer words when the evidence is sparse.
Lead with concrete facts. Include only qualifications needed to interpret them; put detailed methodology in source context.
Avoid scene-setting, storytelling, rhetorical transitions, repeated figures, repeated caveats and a concluding recap.`;
