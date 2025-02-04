import { ChatCompletionRequestMessageRoleEnum } from "openai";
import WAWebJS from "whatsapp-web.js";
import { AgentManagerInterface } from "agent_manager/types.ts";
import { ENV_VARS } from "./config.ts";


export interface ChatHistory {
    role: ChatCompletionRequestMessageRoleEnum;
    content: string;
}

export enum COMMAND_TYPES {
    CHAT_AGENT = 'CHAT_AGENT',
    CREATE_AGENT = 'CREATE_AGENT',
    LIST_AGENTS = 'LIST_AGENTS',
    MODIFY_AGENT = 'MODIFY_AGENT',
    MODIFY_AGENT_CONFIG = 'MODIFY_AGENT_CONFIG',
    GET_AGENT = 'GET_AGENT',
    DELETE_AGENT_HISTORY = 'DELETE_AGENT_HISTORY',
    RELOAD_AGENT_MEMORY = 'RELOAD_AGENT_MEMORY',
    HELP = 'HELP',
    UPDATE_CONFIG = 'UPDATE_CONFIG',
    PRINT_CONFIG = 'PRINT_CONFIG',
    STABLE_DIFFUSION = 'STABLE_DIFFUSION',
    SD_CREATE_CONFIG = 'SD_CREATE_CONFIG',
    SD_LIST_CONFIGS = 'SD_LIST_CONFIGS',
    SD_UPDATE_CONFIG = 'SD_UPDATE_CONFIG',
    SD_SHOW_CONFIG = 'SD_SHOW_CONFIG',
    SD_LIST_MODELS = 'SD_LIST_MODELS',
    SD_SET_MODEL = 'SD_SET_MODEL',
    SD_CURRENT_MODEL = 'SD_CURRENT_MODEL',
    SD_IMG2IMG = 'SD_IMG2IMG'
}
export interface StableDiffusionConfig {
    id: string;
    steps: number;
    width: number;
    height: number;
    cfgScale: number;
    negativePrompt: string;
    stylePrompt: string;
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
    [COMMAND_TYPES.MODIFY_AGENT_CONFIG]: {
        agentId: string;
        settings: Array<{
            attribute: 'temperature' | 'topP' | 'frequencyPenalty' | 'presencePenalty';
            value: number;
        }>;
    };
    [COMMAND_TYPES.HELP]: void;
    [COMMAND_TYPES.UPDATE_CONFIG]: {
        key: ENV_VARS.OPENAI_API_HOST | ENV_VARS.MODEL | ENV_VARS.SD_API_HOST;
        value: string;
    };
    [COMMAND_TYPES.PRINT_CONFIG]: void;
    [COMMAND_TYPES.STABLE_DIFFUSION]: {
        configId: string;
        prompt: string;
    };
    [COMMAND_TYPES.SD_CREATE_CONFIG]: {configId: string} & Omit<StableDiffusionConfig, 'id'>;
    [COMMAND_TYPES.SD_LIST_CONFIGS]: void;
    [COMMAND_TYPES.SD_UPDATE_CONFIG]: {
        configId: string;
        updates: Partial<Omit<StableDiffusionConfig, 'id'>>;
    };
    [COMMAND_TYPES.SD_SHOW_CONFIG]: {
        configId: string;
    };
    [COMMAND_TYPES.SD_LIST_MODELS]: void;
    [COMMAND_TYPES.SD_SET_MODEL]: {
        modelName: string;
    };
    [COMMAND_TYPES.SD_CURRENT_MODEL]: void;
    [COMMAND_TYPES.SD_IMG2IMG]: {
        configId: string;
        denoisingStrength: number;
        prompt: string;
    };
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

