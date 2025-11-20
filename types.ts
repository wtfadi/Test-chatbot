
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system', // For logs or tool statuses
  TOOL_REQUEST = 'tool_request', // The JSON instruction from AI
  TOOL_RESPONSE = 'tool_response' // The raw API response
}

export interface Attachment {
  type: 'image' | 'file';
  url: string;
  mimeType: string;
  data?: string; // Base64 data
  name?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachment?: Attachment;
  metadata?: {
    processingTime?: number;
    apiUrl?: string;
    method?: string;
  };
}

export interface ApiInstruction {
  action: string;
  api_url: string;
  method: string;
  params: any;
}

export interface ApiResponse {
  api_response: string;
}
