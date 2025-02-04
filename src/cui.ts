import AgentManager from './agent_manager/index.ts';
import WAWebJS from'whatsapp-web.js';
import { COMMAND_TYPES, CommandMatcher, Command } from './types.ts';
import commands from './commands.ts';

const functionTriggerTemplateMatcher = (template: string, text: string) => {
    // we split on brackets and get the first part because brackets are used for parameters that can be optional
    // we just need at least one part to match
    const hasBrackets = template.includes('[');
    const templateParts = hasBrackets ? template.split('[')[0].split(' ') : template.split(' ');
    // if there were brackets then the last part of the template is a parameter but in our string it will be empty (because we split on spaces)
    // so we add a placeholder to the end of the template parts
    if(hasBrackets) {
        templateParts[templateParts.length - 1] = "<>";
    }
    const textParts = text.toLocaleLowerCase().split(' ');

    if(textParts.length >= templateParts.length) {
        return templateParts.every((part, index) => {
            // Matches against a parameter
            if(part.startsWith('<') && part.endsWith('>')) {
                return true;
            }
            if(part.startsWith('[') && part.endsWith(']')) {
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
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const agents = this.agentManager.getAgents(conversationId);
        const command = this.getCommand(message.body, agents);
        if(command === undefined) {
            return;
        }
        const parameters = command.getCommandParameters(message.body, agents);
        command.trigger(parameters, this.agentManager, message);
    }
}
