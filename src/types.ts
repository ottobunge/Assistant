import { ChatCompletionRequestMessageRoleEnum } from "openai";
import GPT from "./gpt.ts";


export interface ChatHistory {
    role: ChatCompletionRequestMessageRoleEnum;
    content: string;
}

export interface ConversationAgentsMapping {
    [conversationId: string]: {
        [agentId: string]: GPT;
    };
}
