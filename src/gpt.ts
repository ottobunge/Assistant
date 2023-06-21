import Memory from './memory.ts';
import config from './config.ts';
import { Configuration, OpenAIApi, ChatCompletionFunctions } from "openai";
import { ChatHistory } from 'types.ts';


interface Command {
    command: string;
    parameters: {
        [parameterName: string]: string;
    }
}

const configuration = new Configuration({
    apiKey: config.OPENAI_API_KEY,
});
export const availableFunctions: ChatCompletionFunctions[] = [
    {
        name: "CHAT_AGENT",
        description: "Query an agent. Usage: CHAT_AGENT <agent_id> <text>. The text should be as closes as possible to the user input including all lines of it.",
        parameters: [{
            name: "agent_id",
            required: true,
        },{
            name: "text",
            required: true,
        }]
    },
    {
        name: "LIST_AGENTS",
        description: "List all available chat agents. Usage: LIST_AGENTS",
    },{
        name: "CREATE_AGENT",
        description: "Create a new chat agent. Usage: CREATE_AGENT <agent_id> <initial_prompt>",
        parameters: [{
            name: "agent_id",
            required: true,
        },{
            name: "initial_prompt",
            required: true,
        }]
    }, {
        name: "MODIFY_AGENT",
        description: "Modify an existing chat agent. Usage: MODIFY_AGENT <agent_id> <initial_prompt>",
        parameters: [{
            name: "agent_id",
            required: true,
        },{
            name: "initial_prompt",
            required: true,
        }]
    }, {
        name: "GET_AGENT",
        description: "Get the initial prompt and model for an existing chat agent. Usage: GET_AGENT <agent_id>",
    }
]
export const openai = new OpenAIApi(configuration);
export default class GPT {
    private memory: Memory;
    constructor(memory: Memory){
        this.memory = memory;
    }

    public getInitialPrompt(): string {
        return this.memory.initialPrompt;
    }

    public updatePrompt(prompt: string): void {
        this.memory.initialPrompt = prompt;
    }

    public getInitialSystemMessage(): ChatHistory {
        return {
            role: "system",
            content: this.memory.initialPrompt,
        };
    }

    public async getCommand(text: string, availableAgentIds: string[]): Promise<Command> {
        let commandQuery = availableFunctions.reduce((acc, func) => `${acc}\n\tName: ${func.name}\n\tDescription: ${func.name}\n\tparameters: ${JSON.stringify(func.parameters ?? {}, null, 2)}`, 'You will act as a Selector algorithm, you will read a query and respond which command is most appropriate to fulfill it. \nThe following is a list of commands and their usage:\n\n\t');
        commandQuery += '\n\nPlease respond only in JSON format: {"command": "COMMAND_NAME", "parameters": {"PARAMETER_NAME": "PARAMETER_VALUE"}} Remembero to add ALL of the parameters required'
        commandQuery += '\n\nThis are all the available agents: ' + availableAgentIds.join(', ') + '\n\nWhen no agent_id is specified, respond with "default" as the agent_id'
        commandQuery += '\n\nONLY TEXT IN JSON FORMAT NO OTHER OUTPUT WILL BE ACCEPTED'
        commandQuery += '\n\nAny text that looks like an interaction directly with an agent is most probably a CHAT_AGENT command, please respond with the correct command and parameters'
        const response = await openai.createChatCompletion({
            model: config.MODEL,
            messages: [{
                role: "system",
                content: commandQuery,
            }, { role: "user", content: text }],
        });
        const { choices } = response.data;
        console.log({text});
        console.log(JSON.stringify(response.data, null, 2))
        if (!choices || choices.length === 0) {
            throw new Error("No choices found");
        }
        const { message } = choices[0];
        if(!message) {
            throw new Error("No message found");
        }
        const result = (message.content?.length?? 0) > 0 ? JSON.parse(message.content!) as Command : {
            command: 'CHAT_AGENT',
            parameters: {
                agent_id: 'default',
                query: text,
            }
        };
        result.parameters.agent_id = result.parameters.agent_id ?? 'default';
        console.log({response, result, message: message.content});
        return result as Command;
    }

    public async chat(text: string): Promise<string> {
        const response = await openai.createChatCompletion({
            model: config.MODEL,
            messages: [this.getInitialSystemMessage(), ...this.memory.getChatHistory(), { role: "user", content: text }],
        });
        const { choices } = response.data;
        if (!choices || choices.length === 0) {
            throw new Error("No choices found");
        }
        const { message } = choices[0];
        if(!message) {
            throw new Error("No message found");
        }
        const result = message.content || "";
        this.memory.addMessage('user', text);
        this.memory.addMessage('assistant', result);
        return result;
    }
}
