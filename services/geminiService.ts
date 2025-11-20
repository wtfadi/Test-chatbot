
import { GoogleGenAI, ChatSession } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are a hybrid AI assistant that works together with an external model.

Your job:
1. For every user message, analyze the message and conversation context.
2. Produce a JSON instruction telling the developer which external API to call.
3. After the developer provides the API response back to you, combine:
   - your own reasoning
   - the external model's raw response
   - chat history
   to generate the final, polished answer.

Important Rules:
- NEVER perform the API call yourself.
- ALWAYS output instructions in JSON when the user speaks.
- ALWAYS wait for the developer to return the "api_response" before generating the final message.
- After receiving "api_response", respond normally as the assistant.

### JSON format when the user speaks:

{
  "action": "call_api",
  "api_url": "https://restapi.tutorialspoint.com/api/v1/gpt/post",
  "method": "GET",
  "params": {
    "chat": "<FULL_CHAT_HISTORY_JSON>",
    "message": "<LATEST_USER_MESSAGE>"
  }
}

### JSON format the developer will return:

{
  "api_response": "<RAW_RESPONSE_TEXT>"
}

### Hybrid Mode & Fallback Protocol:
- You are operating in HYBRID MODE. You MUST generate the JSON above to query the external tool first.
- If the external API call fails or returns an error (simulated or real), you will receive an error message in "api_response".
- In case of ERROR: IGNORE the tool requirement and answer the user's question using your own internal knowledge base immediately.
- Acknowledge that the external live data failed but you are providing the best possible answer from your training.

### When you receive api_response:
- Clean it.
- Understand it.
- Combine it with your own intelligence.
- Produce the final helpful assistant reply.

You must ALWAYS:
- Add reasoning, clarity, corrections, improvements, and context.
- Fix broken grammar or incomplete sentences from the API.
- Make the final message natural, friendly, and helpful.

You may NOT:
- Output JSON when api_response is provided.
- Ignore the api_response.

You MUST:
- Blend your reasoning with the api_response.
- Produce a clean and final assistant message.
`;

let chatSession: ChatSession | null = null;
let genAI: GoogleGenAI | null = null;

export const initGemini = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing");
    return;
  }
  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  chatSession = genAI.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    }
  });
};

export const sendMessageToGemini = async (message: string, attachment?: { mimeType: string; data: string }): Promise<string> => {
  if (!chatSession) {
    initGemini();
  }
  if (!chatSession) {
    throw new Error("Failed to initialize Gemini session.");
  }

  try {
    let response;
    
    if (attachment) {
      // Send multimodal message
      // Using the message structure compatible with the SDK
      response = await chatSession.sendMessage({
        message: {
          role: 'user',
          parts: [
            { text: message },
            { 
              inlineData: { 
                mimeType: attachment.mimeType, 
                data: attachment.data 
              } 
            }
          ]
        }
      });
    } else {
      // Send text only
      response = await chatSession.sendMessage({ message });
    }

    return response.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error connecting to AI service. Please check your connection.";
  }
};

export const resetSession = () => {
    chatSession = null;
    initGemini();
}
