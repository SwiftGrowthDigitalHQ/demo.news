/**
 * AI Brain + Memory System - Type Definitions
 * 
 * This file contains all TypeScript interfaces for the AI system.
 * Provider-specific types are isolated for easy replacement.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE AI TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Message role in a conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * AI provider types
 */
export type AIProvider = 'openrouter' | 'openai' | 'anthropic' | 'google' | 'custom';

/**
 * Conversation status
 */
export type ConversationStatus = 'active' | 'archived' | 'deleted';

/**
 * Memory types for long-term storage
 */
export type MemoryType = 'preference' | 'fact' | 'workflow' | 'decision' | 'instruction';

/**
 * AI usage log status
 */
export type AIUsageStatus = 'success' | 'error' | 'timeout' | 'cancelled' | 'rate_limited';

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATION & MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A conversation thread between user and AI
 */
export interface Conversation {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string | null;
  status: ConversationStatus;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * A single message in a conversation
 */
export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  model: string | null;
  token_count: number | null;
  metadata: MessageMetadata | null;
  created_at: string;
}

/**
 * Additional metadata for messages
 */
export interface MessageMetadata {
  finish_reason?: string;
  temperature?: number;
  max_tokens?: number;
  stop_reason?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Conversation summary for efficient context management
 */
export interface ConversationSummary {
  id: string;
  conversation_id: string;
  summary_text: string;
  key_points: string[];
  decisions: string[];
  unresolved_tasks: string[];
  important_context: Record<string, unknown>;
  summarized_up_to_message_id: string | null;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Long-term user memory
 */
export interface UserMemory {
  id: string;
  user_id: string;
  tenant_id: string;
  type: MemoryType;
  content: string;
  importance: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  source_conversation_id: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Project/CMS-level memory (tenant-scoped)
 */
export interface ProjectMemory {
  id: string;
  tenant_id: string;
  type: MemoryType;
  content: string;
  category: string; // 'architecture', 'workflow', 'bug', 'fix', 'convention', etc.
  relevance_score: number; // 0.0 to 1.0
  source_conversation_id: string | null;
  created_by_user_id: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Memory extraction result from AI
 */
export interface MemoryExtraction {
  should_store: boolean;
  type: MemoryType;
  content: string;
  importance: number;
  confidence: number;
  category?: string; // for project memories
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDING TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Priority levels for context items
 */
export type ContextPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * A single item of context to include in the AI prompt
 */
export interface ContextItem {
  type: 'message' | 'summary' | 'user_memory' | 'project_memory' | 'system' | 'cms_info';
  content: string;
  priority: ContextPriority;
  token_estimate: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Complete context for an AI request
 */
export interface Context {
  items: ContextItem[];
  total_tokens_estimate: number;
  token_budget: number;
  truncated: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI model configuration (per tenant)
 */
export interface ModelConfig {
  id: string;
  tenant_id: string;
  provider: AIProvider;
  model: string; // e.g., "openrouter/free", "anthropic/claude-3-5-sonnet"
  temperature: number;
  max_tokens: number;
  streaming_enabled: boolean;
  daily_token_limit: number | null;
  monthly_token_limit: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Default model configuration values
 */
export const DEFAULT_MODEL_CONFIG: Omit<ModelConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  provider: 'openrouter',
  model: 'openrouter/free',
  temperature: 0.7,
  max_tokens: 4096,
  streaming_enabled: true,
  daily_token_limit: null,
  monthly_token_limit: null,
  enabled: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// AI REQUEST & RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request to the AI system
 */
export interface AIRequest {
  conversation_id: string | null; // null = new conversation
  message: string;
  model?: string; // optional override
  temperature?: number; // optional override
  max_tokens?: number; // optional override
  streaming?: boolean; // optional override
  metadata?: Record<string, unknown>;
}

/**
 * Response from the AI system (non-streaming)
 */
export interface AIResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  model: string;
  finish_reason: string;
  usage: AIUsage;
  metadata?: Record<string, unknown>;
}

/**
 * Streaming chunk from the AI
 */
export interface AIStreamChunk {
  type: 'start' | 'content' | 'done' | 'error';
  conversation_id?: string;
  message_id?: string;
  content?: string;
  model?: string;
  finish_reason?: string;
  usage?: AIUsage;
  error?: AIError;
  metadata?: Record<string, unknown>;
}

/**
 * Token usage information
 */
export interface AIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * AI error information
 */
export interface AIError {
  code: string;
  message: string;
  type: 'authentication' | 'rate_limit' | 'timeout' | 'provider_error' | 'validation' | 'network' | 'unknown';
  retryable: boolean;
  retry_after?: number; // seconds
  details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE LOGGING TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI usage log entry (for analytics and debugging)
 */
export interface AIUsageLog {
  id: string;
  tenant_id: string;
  user_id: string;
  conversation_id: string | null;
  provider: AIProvider;
  model: string;
  request_type: 'chat' | 'memory_extraction' | 'summarization' | 'other';
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  latency_ms: number | null;
  status: AIUsageStatus;
  error_type: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// OPENROUTER-SPECIFIC TYPES (ISOLATED FOR EASY REPLACEMENT)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OpenRouter API message format
 */
export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * OpenRouter API request payload
 */
export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * OpenRouter API response (non-streaming)
 */
export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}

/**
 * OpenRouter streaming chunk
 */
export interface OpenRouterStreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouter error response
 */
export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT API TYPES (Frontend → Edge Function)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create new conversation request
 */
export interface CreateConversationRequest {
  title?: string;
  initial_message?: string;
}

/**
 * Send message request
 */
export interface SendMessageRequest {
  conversation_id: string | null;
  message: string;
  streaming?: boolean;
}

/**
 * Get conversation history request
 */
export interface GetConversationHistoryRequest {
  conversation_id: string;
  limit?: number;
  before_message_id?: string;
}

/**
 * Get conversations list request
 */
export interface GetConversationsRequest {
  limit?: number;
  offset?: number;
  status?: ConversationStatus;
}

/**
 * Delete conversation request
 */
export interface DeleteConversationRequest {
  conversation_id: string;
  hard_delete?: boolean; // true = permanent, false = soft delete
}

/**
 * Regenerate response request
 */
export interface RegenerateResponseRequest {
  message_id: string;
  streaming?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Token estimation result
 */
export interface TokenEstimate {
  count: number;
  method: 'exact' | 'estimated';
}

/**
 * Context builder options
 */
export interface ContextBuilderOptions {
  conversation_id: string | null;
  user_id: string;
  tenant_id: string;
  message: string;
  token_budget: number;
  include_conversation_history: boolean;
  include_conversation_summary: boolean;
  include_user_memories: boolean;
  include_project_memories: boolean;
  max_history_messages: number;
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
  query: string;
  user_id?: string;
  tenant_id: string;
  memory_types?: MemoryType[];
  min_importance?: number;
  min_confidence?: number;
  limit?: number;
}

/**
 * Conversation list result
 */
export interface ConversationListResult {
  conversations: Conversation[];
  total_count: number;
  has_more: boolean;
}

/**
 * Message list result
 */
export interface MessageListResult {
  messages: Message[];
  total_count: number;
  has_more: boolean;
}

/**
 * AI analytics result
 */
export interface AIAnalytics {
  tenant_id: string;
  date_range: {
    start: string;
    end: string;
  };
  total_conversations: number;
  total_messages: number;
  total_tokens: number;
  total_cost_estimate: number;
  top_models: Array<{
    model: string;
    count: number;
    tokens: number;
  }>;
  error_rate: number;
  avg_latency_ms: number;
}
