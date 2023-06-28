import { ChatCompletionRequestMessageRoleEnum } from "openai";
import WAWebJS from "whatsapp-web.js";
import { AgentManagerInterface } from "agent_manager/types.ts";


export interface ChatHistory {
    role: ChatCompletionRequestMessageRoleEnum;
    content: string;
}

export enum COMMAND_TYPES {
    CHAT_AGENT = 'CHAT_AGENT',
    CREATE_AGENT = 'CREATE_AGENT',
    LIST_AGENTS = 'LIST_AGENTS',
    MODIFY_AGENT = 'MODIFY_AGENT',
    GET_AGENT = 'GET_AGENT',
    DELETE_AGENT_HISTORY = 'DELETE_AGENT_HISTORY',
    RELOAD_AGENT_MEMORY = 'RELOAD_AGENT_MEMORY',
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
    [COMMAND_TYPES.RELOAD_AGENT_MEMORY]: {
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
    trigger(parameters: CommandParameters[CommandType], agentManager: AgentManagerInterface, message: WAWebJS.Message): Promise<boolean>;
}
