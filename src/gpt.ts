import Memory from './memory.ts';
import config from './config.ts';
import { Configuration, OpenAIApi } from "openai";
import { ChatHistory } from 'types.ts';


const configuration = new Configuration({
    apiKey: config.OPENAI_API_KEY,
    basePath: 'http://172.29.64.1:5001/v1'
});

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

    public getInitialSystemMessage(participants: string[]): ChatHistory {
        return {
            role: "system",
            content: this.memory.initialPrompt+`\n\nThis are all the people in the conversation: ${participants.join(', ')}`,
        };
    }
    public forget(): void {
        this.memory.forget();
    }
    public reloadMemory(): void {
        this.memory.readFromFile();
    }
    public async chat(text: string, participants: string[]): Promise<string> {
        const response = await openai.createChatCompletion({
            model: config.MODEL,
            max_tokens: 700,
            messages: [this.getInitialSystemMessage(participants), ...this.memory.getChatHistory(), { role: "user", content: text }],
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
