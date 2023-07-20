import Memory from './memory.ts';
import config from './config.ts';
import { Configuration, OpenAIApi } from "openai";
import { ChatHistory } from './types.ts';
import { AgentConfig } from './agentConfig.ts';


const configuration = new Configuration({
    apiKey: config.OPENAI_API_KEY,
    basePath: config.OPENAI_API_HOST,
});

export const openai = new OpenAIApi(configuration);
export default class GPT {
    private memory: Memory;
    private config: AgentConfig;
    constructor(memory: Memory, config: AgentConfig){
        this.memory = memory;
        this.config = config;
    }
    public setTopP(topP: number): void {
        this.config.topP = topP;
    }
    public setTemperature(temperature: number): void {
        this.config.temperature = temperature;
    }
    public setFrequencyPenalty(frequencyPenalty: number): void {
        this.config.frequencyPenalty = frequencyPenalty;
    }
    public setPresencePenalty(presencePenalty: number): void {
        this.config.presencePenalty = presencePenalty;
    }
    public getConfig(): AgentConfig {
        return this.config;
    }
    public getInitialPrompt(): string {
        return this.memory.initialPrompt;
    }

    public updatePrompt(prompt: string): void {
        this.memory.initialPrompt = prompt;
    }

    public getInitialSystemMessage(participants: string[]): ChatHistory {
        const conversationFormat = 'This is the conversation Format\n\nUser:\nCurrent Date: [MESSAGE_DATE]\nCurrent Time: [MESSAGE_TIME]\nFrom: [USER_FROM]\nBody: [USER_MESSAGE]\nAssistant: [ASSISTANT_RESPONSE]'
        return {
            role: "system",
            content: "System: You are an AI system embedded in a whatsapp group.\n\n" + conversationFormat +"\n\nThis is a description of yourself: " + this.memory.initialPrompt+`\n\nThis are all the people in the conversation: ${participants.join(', ')}`+ `\n\nThe actual conversation starts here.\n`,
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
            top_p: this.config.topP,
            temperature: this.config.temperature,
            frequency_penalty: this.config.frequencyPenalty,
            presence_penalty: this.config.presencePenalty,
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
