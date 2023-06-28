import Config from './config.ts';
import WAWebJS from'whatsapp-web.js';
import { client } from './wapp.ts';
import { COMMAND_TYPES, CommandMatcher } from './types.ts';
async function makeMessageString  (message: WAWebJS.Message, body: string) {
    const dateString = `Current Date: ${new Date().toLocaleDateString()}`;
    const timesString = `Current Time: ${new Date().toLocaleTimeString()}`;
    const contact = await message.getContact();
    const fromString = `From: ${contact.shortName || contact.pushname || contact.name  || message.from}`.replace(Config.OWN_PHONE_NUMBER, Config.OWNER);
    const bodyString = `Body: ${body}`;
    return [dateString, timesString, fromString, bodyString].join("\n")
}

export const availableCommands: CommandMatcher<COMMAND_TYPES>[] = []
availableCommands.push({
    command: COMMAND_TYPES.CHAT_AGENT,
    template: ['assistant <agentId> <...text>', 'assistant <...text>'],
    description: "Query an agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const maybeAgentId = availableAgentIds.find(agentId => textParts[1].includes(agentId.toLocaleLowerCase()));
        const agentId = maybeAgentId || Config.DEFAULT_AGENT_ID;
        const textToSend = maybeAgentId ? textParts.slice(2).join(' ') : textParts.slice(1).join(' ');
        return {
            agentId,
            text: textToSend,
        }
    },
    trigger: async (parameters, agentManager, message) => {
        message.reply(`🤖:\nProcessing...`);
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const queryAgent = agentManager.getAgent(conversationId, parameters.agentId);
        const query = await makeMessageString(message, parameters.text);
        let participants: string[] = [];
        if(chat.isGroup){
            const groupCHAT = chat as WAWebJS.GroupChat;
            participants = await Promise.all(groupCHAT.participants.map(async(participant) => {
                const contact = (await client.getContactById(participant.id._serialized));
                if(contact.number.includes(Config.OWN_PHONE_NUMBER) || contact.isMe){
                    return Config.OWNER;
                }
                return contact.name || contact.pushname || contact.shortName || participant.id._serialized;
            }));
        }else {
            const contact = await message.getContact();
            participants = [contact.pushname || contact.name || contact.shortName || contact.id._serialized];
        }
        if(queryAgent !== undefined){
            try {
                const response = (await queryAgent.chat(query, participants)).trim();
                const nameString = parameters.agentId === 'default' ? '🤖:' : `🤖 ${parameters.agentId}:\n`;
                message.reply(`${nameString}\n${response}`);
                return true;
            }catch(error){
                message.reply("There was an error processing your request.");
            }
        } else {
            message.reply(`🤖:\nNo agent named ${parameters.agentId} exists!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.CHAT_AGENT>);
availableCommands.push({
    command: COMMAND_TYPES.DELETE_AGENT_HISTORY,
    template: '/agent <agentId> forget history',
    description: "Delete the chat history of an agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = availableAgentIds.find(agentId => textParts[1].includes(agentId.toLocaleLowerCase()));
        return {
            agentId,
        }
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const deleteAgentName = parameters.agentId;
        const deleteMemoryAgent = agentManager.getAgent(conversationId, parameters.agentId);
        if(deleteMemoryAgent !== undefined){
            deleteMemoryAgent.forget();
            message.reply(`🤖:\nDeleted agent ${deleteAgentName} memory!`);
            return true;
        } else {
            message.reply(`🤖:\nAgent ${deleteAgentName} does not exist!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.DELETE_AGENT_HISTORY>);
availableCommands.push({
    command: COMMAND_TYPES.RELOAD_AGENT_MEMORY,
    template: '/agent <agentId> reload history',
    description: "Reload the chat history of an agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = availableAgentIds.find(agentId => textParts[1].includes(agentId.toLocaleLowerCase()));
        return {
            agentId,
        }
    },
    trigger: async(parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const reloadAgentName = parameters.agentId;
        const reloadMemoryAgent = agentManager.getAgent(conversationId, parameters.agentId);
        if(reloadMemoryAgent !== undefined){
            reloadMemoryAgent.reloadMemory();
            message.reply(`🤖:\nReloaded agent ${reloadAgentName} memory!`);
            return true;
        } else {
            message.reply(`🤖:\nAgent ${reloadAgentName} does not exist!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.RELOAD_AGENT_MEMORY>);
availableCommands.push({
    command: COMMAND_TYPES.LIST_AGENTS,
    template: '/agent list',
    description: "List all available chat agents.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        return undefined;
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const agents = agentManager.getAgents(conversationId)
        message.reply(`🤖:\n\t${agents.join('\n\t')}`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.LIST_AGENTS>);

availableCommands.push({
    command: COMMAND_TYPES.CREATE_AGENT,
    template: '/agent create <agent_id> <...prompt>',
    description: "Create a new chat agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = textParts[2];
        return {
            agentId,
            prompt: textParts.slice(3).join(' '),
        };
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const newAgentName = parameters.agentId;
        const initialPrompt = parameters.prompt;
        if(!agentManager.agentExists(conversationId, newAgentName)){
            const agent = agentManager.createAgent(conversationId, newAgentName, initialPrompt);
            if(agent !== undefined){
                message.reply(`🤖:\nCreated agent ${newAgentName}!\nInitial Prompt: ${initialPrompt}`);
                return true;
            }
        } else {
            message.reply(`🤖:\nAgent ${newAgentName} already exists!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.CREATE_AGENT>);
availableCommands.push({
    command: COMMAND_TYPES.MODIFY_AGENT,
    template: '/agent modify <agent_id> <...prompt>',
    description: "Modify an existing chat agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = availableAgentIds.find(agentId => textParts[2].includes(agentId.toLocaleLowerCase()));
        return {
            agentId,
            prompt: textParts.slice(3).join(' '),
        };
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const modifyAgentName = parameters.agentId;
        const modifiedPrompt = parameters.prompt;
        if(agentManager.agentExists(conversationId, modifyAgentName)){
            agentManager.updatePrompt(conversationId, modifyAgentName, modifiedPrompt);
            message.reply(`🤖:\nUpdated agent ${modifyAgentName}!\nNew Prompt: ${modifiedPrompt}`);
            return true;
        } else {
            message.reply(`🤖:\nAgent ${modifyAgentName} does not exist!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.MODIFY_AGENT>);
availableCommands.push({
    command: COMMAND_TYPES.GET_AGENT,
    template: '/agent get <agentId>',
    description: "Get the initial prompt and model for an existing chat agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = availableAgentIds.find(agentId => textParts[2].includes(agentId.toLocaleLowerCase()));
        return {
            agentId,
        };
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const getAgentName = parameters.agentId;
        if(agentManager.agentExists(conversationId, getAgentName)){
            const prompt = agentManager.getPrompt(conversationId, getAgentName);
            message.reply(`🤖:\nAgent ${getAgentName}!\nPrompt: ${prompt}`);
            return true;
        } else {
            message.reply(`🤖:\nAgent ${getAgentName} does not exist!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.GET_AGENT>);
availableCommands.push({
    command: COMMAND_TYPES.HELP,
    template: '/agent help',
    description: "List all available commands commands.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        return undefined;
    },
    trigger: async (parameters, agentManager, message) => {
        const helpString = availableCommands.map((command) => {
            const templateString = typeof command.template === 'string' ? command.template : command.template.join(' | ');
            return `${command.command}:\n\tDescription: ${command.description}\n\tUsage: ${templateString}`;
        }).join('\n');
        message.reply(`🤖:\n${helpString}`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.HELP>);


export default availableCommands;