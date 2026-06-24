export interface ReasoningDelta {
  conversation_id: string;
  message_id: string;
  delta: string;
  timestamp: string;
}

export interface ReasoningEnd {
  conversation_id: string;
  message_id: string;
  full_text: string;
  duration_ms: number;
}
