/**
 * AI Client Library
 * 
 * Frontend API for interacting with the AI Brain system.
 * All communication goes through secure Edge Functions.
 * Never exposes API keys or secrets to the browser.
 */

import { supabase } from './cms';
import type {
  AIRequest,
  AIResponse,
  AIStreamChunk,
  Conversation,
  Message,
  CreateConversationRequest,
  SendMessageRequest,
  GetConversationHistoryRequest,
  GetConversationsRequest,
  DeleteConversationRequest,
  RegenerateResponseRequest,
  ConversationListResult,
  MessageListResult,
  ModelConfig,
  AIAnalytics,
} from '../types/ai';

// ═══════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

const AI_CHAT_FUNCTION = 'ai-chat';
const AI_MEMORY_FUNCTION = 'ai-memory';

/**
 * Get the base URL for Edge Functions
 */
function getEdgeFunctionUrl(functionName: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }
  return `${supabaseUrl}/functions/v1/${functionName}`;
}

/**
 * Get authenticated headers for Edge Function calls
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get list of conversations for current user
 */
export async function getConversations(
  options: GetConversationsRequest = {}
): Promise<ConversationListResult> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*', { count: 'exact' })
    .eq('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  return {
    conversations: data as Conversation[],
    total_count: data.length,
    has_more: data.length === (options.limit || 50),
  };
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch conversation: ${error.message}`);
  }

  return data as Conversation;
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  options: GetConversationHistoryRequest
): Promise<MessageListResult> {
  let query = supabase
    .from('ai_messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', options.conversation_id)
    .order('created_at', { ascending: true });

  if (options.before_message_id) {
    // Get messages before a specific message (for pagination)
    const { data: beforeMessage } = await supabase
      .from('ai_messages')
      .select('created_at')
      .eq('id', options.before_message_id)
      .single();

    if (beforeMessage) {
      query = query.lt('created_at', beforeMessage.created_at);
    }
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return {
    messages: data as Message[],
    total_count: data.length,
    has_more: data.length === (options.limit || 100),
  };
}

/**
 * Create a new conversation
 */
export async function createConversation(
  request: CreateConversationRequest = {}
): Promise<Conversation> {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl(AI_CHAT_FUNCTION);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'create_conversation',
      title: request.title,
      initial_message: request.initial_message,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to create conversation');
  }

  const result = await response.json();
  return result.conversation as Conversation;
}

/**
 * Delete a conversation (soft delete by default)
 */
export async function deleteConversation(
  request: DeleteConversationRequest
): Promise<void> {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl(AI_CHAT_FUNCTION);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'delete_conversation',
      conversation_id: request.conversation_id,
      hard_delete: request.hard_delete || false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to delete conversation');
  }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) {
    throw new Error(`Failed to archive conversation: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE SENDING (NON-STREAMING)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a message and get a complete response (non-streaming)
 */
export async function sendMessage(request: SendMessageRequest): Promise<AIResponse> {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl(AI_CHAT_FUNCTION);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'send_message',
      conversation_id: request.conversation_id,
      message: request.message,
      streaming: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to send message');
  }

  const result = await response.json();
  return result as AIResponse;
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE SENDING (STREAMING)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a message with streaming response
 * 
 * @param request - Message request
 * @param onChunk - Callback for each streaming chunk
 * @param onError - Callback for errors
 * @param abortSignal - Optional abort signal for cancellation
 */
export async function sendMessageStream(
  request: SendMessageRequest,
  onChunk: (chunk: AIStreamChunk) => void,
  onError: (error: Error) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl(AI_CHAT_FUNCTION);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'send_message',
        conversation_id: request.conversation_id,
        message: request.message,
        streaming: true,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to send message');
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines (SSE format: "data: {...}\n\n")
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Remove "data: " prefix

          if (data === '[DONE]') {
            // Stream complete
            onChunk({ type: 'done' });
            return;
          }

          try {
            const chunk = JSON.parse(data) as AIStreamChunk;
            onChunk(chunk);

            if (chunk.type === 'error') {
              throw new Error(chunk.error?.message || 'Unknown error');
            }
          } catch (parseError) {
            console.error('Failed to parse streaming chunk:', parseError);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        // User cancelled the request
        onChunk({ type: 'error', error: { code: 'cancelled', message: 'Request cancelled', type: 'network', retryable: false } });
      } else {
        onError(error);
      }
    } else {
      onError(new Error('Unknown error occurred'));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REGENERATE RESPONSE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Regenerate the response for a specific message
 */
export async function regenerateResponse(
  request: RegenerateResponseRequest
): Promise<AIResponse> {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl(AI_CHAT_FUNCTION);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'regenerate',
      message_id: request.message_id,
      streaming: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to regenerate response');
  }

  const result = await response.json();
  return result as AIResponse;
}

/**
 * Regenerate response with streaming
 */
export async function regenerateResponseStream(
  request: RegenerateResponseRequest,
  onChunk: (chunk: AIStreamChunk) => void,
  onError: (error: Error) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl(AI_CHAT_FUNCTION);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'regenerate',
        message_id: request.message_id,
        streaming: true,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to regenerate response');
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    // Process stream (same logic as sendMessageStream)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            onChunk({ type: 'done' });
            return;
          }

          try {
            const chunk = JSON.parse(data) as AIStreamChunk;
            onChunk(chunk);

            if (chunk.type === 'error') {
              throw new Error(chunk.error?.message || 'Unknown error');
            }
          } catch (parseError) {
            console.error('Failed to parse streaming chunk:', parseError);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        onChunk({ type: 'error', error: { code: 'cancelled', message: 'Request cancelled', type: 'network', retryable: false } });
      } else {
        onError(error);
      }
    } else {
      onError(new Error('Unknown error occurred'));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL CONFIGURATION (ADMIN ONLY)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get AI model configuration for current tenant
 */
export async function getModelConfig(tenantId: string): Promise<ModelConfig | null> {
  const { data, error } = await supabase
    .from('ai_model_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('enabled', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch model config: ${error.message}`);
  }

  return data as ModelConfig;
}

/**
 * Update AI model configuration (admin only)
 */
export async function updateModelConfig(
  tenantId: string,
  config: Partial<ModelConfig>
): Promise<ModelConfig> {
  const { data, error } = await supabase
    .from('ai_model_configs')
    .upsert({
      tenant_id: tenantId,
      ...config,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update model config: ${error.message}`);
  }

  return data as ModelConfig;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS (ADMIN ONLY)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get AI usage analytics for a date range (admin only)
 */
export async function getAIAnalytics(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<AIAnalytics> {
  const headers = await getAuthHeaders();
  const url = getEdgeFunctionUrl(AI_CHAT_FUNCTION);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'get_analytics',
      tenant_id: tenantId,
      start_date: startDate,
      end_date: endDate,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to fetch analytics');
  }

  const result = await response.json();
  return result as AIAnalytics;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estimate token count for text (rough approximation)
 * 1 token ≈ 4 characters in English
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format AI error for display
 */
export function formatAIError(error: Error | string): string {
  if (typeof error === 'string') {
    return error;
  }

  const message = error.message.toLowerCase();

  if (message.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  if (message.includes('authentication') || message.includes('unauthorized')) {
    return 'Authentication failed. Please sign in again.';
  }

  if (message.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  return error.message || 'An unexpected error occurred.';
}
