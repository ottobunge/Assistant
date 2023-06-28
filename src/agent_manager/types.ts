import GPT from "../gpt.ts";

export interface ConversationAgentsMapping {
    [conversationId: string]: {
        [agentId: string]: GPT;
    };
}

export interface SavedConversationAgentsMapping {
    [conversationId: string]: {
        id: string;
        initialPrompt: string;
    }[];
}

export interface AgentManagerInterface {
    agentExists(conversationId: string, agentId: string): boolean;
    getAgent(conversationId: string, agentId: string): GPT | undefined;
    getAgents(conversationId: string): string[];
    createAgent(conversationId: string, agentId: string, initialPrompt: string): GPT;
    updatePrompt(conversationId: string, agentId: string, prompt: string): void;
    getPrompt(conversationId: string, agentId: string): string | undefined;
    writeToFile(): void;
    readFromFile(): void;
  }
  