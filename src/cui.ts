import AgentManager from './agent_manager.ts';
import Config from './config.ts';
import WAWebJS from'whatsapp-web.js';
import { client } from './wapp.ts';
import { COMMAND_TYPES, CommandMatcher, Command } from './types.ts';

const functionTriggerTemplateMatcher = (template: string, text: string) => {
    const templateParts = template.split(' ');
    const textParts = text.toLocaleLowerCase().split(' ');
    if(textParts.length >= templateParts.length) {
        return templateParts.every((part, index) => {
            if(part.startsWith('<') && part.endsWith('>')) {
                return true;
            }
            return part === textParts[index];
        });
    }
    return false;
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
    }
} as CommandMatcher<COMMAND_TYPES.DELETE_AGENT_HISTORY>);
availableCommands.push({
    command: COMMAND_TYPES.LIST_AGENTS,
    template: '/agent list',
    description: "List all available chat agents.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        return undefined;
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
    }
} as CommandMatcher<COMMAND_TYPES.GET_AGENT>);
availableCommands.push({
    command: COMMAND_TYPES.HELP,
    template: '/agent help',
    description: "List all available commands commands.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        return undefined;
    }
} as CommandMatcher<COMMAND_TYPES.HELP>);
export default class ChatUserInterface {
    private agentManager: AgentManager;

    constructor(agentManager: AgentManager) {
        this.agentManager = agentManager;
    }

    public async makeMessageString  (message: WAWebJS.Message, body: string) {
        const dateString = `Current Date: ${new Date().toLocaleDateString()}`;
        const timesString = `Current Time: ${new Date().toLocaleTimeString()}`;
        const contact = await message.getContact();
        const fromString = `From: ${contact.shortName || contact.pushname || contact.name  || message.from}`.replace(Config.OWN_PHONE_NUMBER, Config.OWNER);
        const bodyString = `Body: ${body}`;
        return [dateString, timesString, fromString, bodyString].join("\n")
    }

    public getCommand(text: string, availableAgentIds: string[]) {
        const command = availableCommands.find((command) => {
            if(typeof command.template === 'string') {
                return functionTriggerTemplateMatcher(command.template, text);
            } else {
                return command.template.some((template) => functionTriggerTemplateMatcher(template, text));
            }
        });
        if(command === undefined) {
            return undefined;
        }
        const commandParameters = command.getCommandParameters(text, availableAgentIds);
        return {
            command: command.command,
            parameters: commandParameters,
        };
    }

    public async processMessage(message: WAWebJS.Message) {
        const body = message.body.toLowerCase();
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const agents = this.agentManager.getAgents(conversationId);
        const command = this.getCommand(body, agents);
        if(command === undefined) {
            return;
        }
        console.log(`🤖:\n${JSON.stringify(command, null, 2)}`)
        switch(command.command) {
            case COMMAND_TYPES.CHAT_AGENT:
                const chatComand = command as Command<COMMAND_TYPES.CHAT_AGENT>;
                message.reply(`🤖:\nProcessing...`);
                const queryAgent = this.agentManager.getAgent(conversationId, chatComand.parameters.agentId);
                const query = await this.makeMessageString(message, chatComand.parameters.text);
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
                        const nameString = chatComand.parameters.agentId === 'default' ? '🤖:' : `🤖 ${chatComand.parameters.agentId}:\n`;
                        message.reply(`${nameString}\n${response}`);
                    }catch(error){
                        message.reply("There was an error processing your request.");
                    }
                } else {
                    message.reply(`🤖:\nNo agent named ${chatComand.parameters.agentId} exists!`);
                }
                return
            case COMMAND_TYPES.CREATE_AGENT:
                const createCommand = command as Command<COMMAND_TYPES.CREATE_AGENT>;
                const newAgentName = createCommand.parameters.agentId;
                const initialPrompt = createCommand.parameters.prompt;
                if(!this.agentManager.agentExists(conversationId, newAgentName)){
                    const agent = this.agentManager.createAgent(conversationId, newAgentName, initialPrompt);
                    if(agent !== undefined){
                        message.reply(`🤖:\nCreated agent ${newAgentName}!\nInitial Prompt: ${initialPrompt}`);
                    }
                } else {
                    message.reply(`🤖:\nAgent ${newAgentName} already exists!`);
                }
                return
            case COMMAND_TYPES.LIST_AGENTS:
                const agents = this.agentManager.getAgents(conversationId)
                message.reply(`🤖:\n\t${agents.join('\n\t')}`);
                return
            case COMMAND_TYPES.MODIFY_AGENT:
                const modifyCommand = command as Command<COMMAND_TYPES.MODIFY_AGENT>;
                const modifyAgentName = modifyCommand.parameters.agentId;
                const modifiedPrompt = modifyCommand.parameters.prompt;
                if(this.agentManager.agentExists(conversationId, modifyAgentName)){
                    this.agentManager.updatePrompt(conversationId, modifyAgentName, modifiedPrompt);
                    message.reply(`🤖:\nUpdated agent ${modifyAgentName}!\nNew Prompt: ${modifiedPrompt}`);
                } else {
                    message.reply(`🤖:\nAgent ${modifyAgentName} does not exist!`);
                }
                return
            case COMMAND_TYPES.GET_AGENT:
                const getAgentCommand = command as Command<COMMAND_TYPES.GET_AGENT>;
                const getAgentName = getAgentCommand.parameters.agentId;
                if(this.agentManager.agentExists(conversationId, getAgentName)){
                    const prompt = this.agentManager.getPrompt(conversationId, getAgentName);
                    message.reply(`🤖:\nAgent ${getAgentName}!\nPrompt: ${prompt}`);
                } else {
                    message.reply(`🤖:\nAgent ${getAgentName} does not exist!`);
                }
                return
            case COMMAND_TYPES.DELETE_AGENT_HISTORY:
                const deleteAgentCommand = command as Command<COMMAND_TYPES.DELETE_AGENT_HISTORY>;
                const deleteAgentName = deleteAgentCommand.parameters.agentId;
                const deleteMemoryAgent = this.agentManager.getAgent(conversationId, deleteAgentCommand.parameters.agentId);
                if(deleteMemoryAgent !== undefined){
                    deleteMemoryAgent.forget();
                    message.reply(`🤖:\nDeleted agent ${deleteAgentName} memory!`);
                } else {
                    message.reply(`🤖:\nAgent ${deleteAgentName} does not exist!`);
                }
                return
            case COMMAND_TYPES.HELP:
                const helpString = availableCommands.map((command) => {
                    const templateString = typeof command.template === 'string' ? command.template : command.template.join(' | ');
                    return `${command.command}:\n\tDescription: ${command.description}\n\tUsage: ${templateString}`;
                }).join('\n')
                message.reply(`🤖:\n${helpString}`);
            default:
                return
        }
    }
}
