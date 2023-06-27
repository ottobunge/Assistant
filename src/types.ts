import { ChatCompletionRequestMessageRoleEnum } from "openai";
import { ChatCompletionFunctions } from "openai";
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

export interface SavedConversationAgentsMapping {
    [conversationId: string]: {
        id: string;
        initialPrompt: string;
    }[];
}

export enum COMMAND_TYPES {
    CHAT_AGENT = 'CHAT_AGENT',
    CREATE_AGENT = 'CREATE_AGENT',
    LIST_AGENTS = 'LIST_AGENTS',
    MODIFY_AGENT = 'MODIFY_AGENT',
    GET_AGENT = 'GET_AGENT',
    DELETE_AGENT_HISTORY = 'DELETE_AGENT_HISTORY',
    HELP = 'HELP',
}

export interface CommandParameters {
    [COMMAND_TYPES.CHAT_AGENT]: {
        agentId: string;
        text: string;
    };
    [COMMAND_TYPES.CREATE_AGENT]: {
        agentId: string;
        prompt: string;
    };
    [COMMAND_TYPES.LIST_AGENTS]: void;
    [COMMAND_TYPES.MODIFY_AGENT]: {
        agentId: string;
        prompt: string;
    };
    [COMMAND_TYPES.GET_AGENT]: {
        agentId: string;
    };
    [COMMAND_TYPES.DELETE_AGENT_HISTORY]: {
        agentId: string;
    };
    [COMMAND_TYPES.HELP]: void;
}

export interface Command<CommandType extends COMMAND_TYPES> {
    command: CommandType;
    parameters: CommandParameters[CommandType];
}

export interface CommandMatcher<CommandType extends COMMAND_TYPES> {
    template: string | string[];
    command: CommandType;
    description: string;
    getCommandParameters(text: string, availableAgentIds: string[]): CommandParameters[CommandType];
}
