import AgentManager from './agent_manager/index.ts';
import WAWebJS from'whatsapp-web.js';
import { COMMAND_TYPES, CommandMatcher, Command } from './types.ts';
import commands from './commands.ts';

const functionTriggerTemplateMatcher = (template: string, text: string) => {
    const templateParts = template.split(' ');
    const textParts = text.toLocaleLowerCase().split(' ');
    if(textParts.length >= templateParts.length) {
        return templateParts.every((part, index) => {
            // Matches against a parameter
            if(part.startsWith('<') && part.endsWith('>')) {
                return true;
            }
            // Matches against a literal in /assistant <text> /assistant is the literal <text> is the parameter
            return part === textParts[index];
        });
    }
    return false;
}


export default class ChatUserInterface {
    private agentManager: AgentManager;

    constructor(agentManager: AgentManager) {
        this.agentManager = agentManager;
    }

    public getCommand(text: string, availableAgentIds: string[]): CommandMatcher<COMMAND_TYPES> | undefined {
        const command = commands.find((command) => {
            if(typeof command.template === 'string') {
                return functionTriggerTemplateMatcher(command.template, text);
            } else {
                return command.template.some((template) => functionTriggerTemplateMatcher(template, text));
            }
        });
        if(command === undefined) {
            return undefined;
        }
        return command;
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
        const parameters = command.getCommandParameters(body, agents);
        command.trigger(parameters, this.agentManager, message);
    }
}
