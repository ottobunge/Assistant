import AgentManager from './agent_manager.ts';
import Config from './config.ts';
import WAWebJS from'whatsapp-web.js';

export enum COMMANDS {
    CHAT_AGENT = 'CHAT_AGENT',
    CREATE_AGENT = 'CREATE_AGENT',
    LIST_AGENTS = 'LIST_AGENTS',
    MODIFY_AGENT = 'MODIFY_AGENT',
    GET_AGENT = 'GET_AGENT',
}

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
    
    public async processMessage(message: WAWebJS.Message) {
        const body = message.body.toLowerCase();
        if(body.startsWith('assistant')) {
            const conversationId = (await message.getChat()).id._serialized;
            message.reply(`🤖:\nProcessing...`);
            const agents = this.agentManager.getAgents(conversationId);
            const command = await (this.agentManager.getAgent(conversationId, 'default')!).getCommand(body, agents);
            console.log(`🤖:\n${JSON.stringify(command, null, 2)}`)
            switch(command.command) {
                case COMMANDS.CHAT_AGENT:
                    const queryAgent = this.agentManager.getAgent(conversationId, command.parameters.agent_id);
                    const query = await this.makeMessageString(message, command.parameters.text);
                    if(queryAgent !== undefined){
                        try {
                            const response = await queryAgent.chat(query);
                            const nameString = command.parameters.agent_id === 'default' ? '🤖:' : `🤖 ${command.parameters.agent_id}:\n`;
                            message.reply(`${nameString}\n${response}`);
                        }catch(error){
                            message.reply("There was an error processing your request.");
                        }
                    } else {
                        message.reply(`🤖:\nNo agent named ${command.parameters.agent_id} exists!`);
                    }
                    return
                case COMMANDS.CREATE_AGENT:
                    const newAgentName = command.parameters.agent_id;
                    const initialPrompt = command.parameters.initial_prompt;
                    if(!this.agentManager.agentExists(conversationId, newAgentName)){
                        const agent = this.agentManager.createAgent(conversationId, newAgentName, initialPrompt);
                        if(agent !== undefined){
                            message.reply(`🤖:\nCreated agent ${newAgentName}!\nInitial Prompt: ${initialPrompt}`);
                        }
                    } else {
                        message.reply(`🤖:\nAgent ${newAgentName} already exists!`);
                    }
                    return
                case COMMANDS.LIST_AGENTS:
                    const agents = this.agentManager.getAgents(conversationId)
                    message.reply(`🤖:\n\t${agents.join('\n\t')}`);
                    return
                case COMMANDS.MODIFY_AGENT:
                    const modifyAgentName = command.parameters.agent_id;
                    const modifiedPrompt = command.parameters.initial_prompt
                    if(this.agentManager.agentExists(conversationId, modifyAgentName)){
                        this.agentManager.updatePrompt(conversationId, modifyAgentName, modifiedPrompt);
                        message.reply(`🤖:\nUpdated agent ${modifyAgentName}!\nNew Prompt: ${modifiedPrompt}`);
                    } else {
                        message.reply(`🤖:\nAgent ${modifyAgentName} does not exist!`);
                    }
                    return
                case COMMANDS.GET_AGENT:
                    const getAgentName = command.parameters.agent_id;
                    if(this.agentManager.agentExists(conversationId, getAgentName)){
                        const prompt = this.agentManager.getPrompt(conversationId, getAgentName);
                        message.reply(`🤖:\nAgent ${getAgentName}!\nPrompt: ${prompt}`);
                    } else {
                        message.reply(`🤖:\nAgent ${getAgentName} does not exist!`);
                    }
                    return
                default:
                    return
            }
        }
        
    }
}
