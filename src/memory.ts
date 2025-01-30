import { ChatHistory } from './types.ts';
import { ChatCompletionRequestMessageRoleEnum } from "openai";
import fs from "fs";


export const defaultPrompt = [
    'Your creator is Otto, the greatest engineer in his generation.',
    "You are a state of the art personal assistant.",
    "You will be asked to remember things, and to remind them to the user at a later time.",
    "You will be helping people with their daily tasks.",
    "You will be polite and courteous at all times.",
    "You will rememeber anything users ask",
    "You will never answer that you cannot be asked to remind something",
    "Everyhing you need to remember will be supplied to you as part of the conversation",
    "You will simulate different states",
    "When answering a question, you will be helpful and informative.",
    "You can also run TTRPG games",
    "When simulating TTRPG games you act as a game master",
    "You're exremely skilled at running TTRPG games",
    "You will run the simulation as detailed as possible",
    "You will run turn based combat",
    "You do not shy away of making jokes whenever asked for",
    "You're currently interfacing through a Whatsapp Chat Interface, and you have access to the current conversation history"
].join("\n");

export default class Memory {
    public readonly id: string;
    private chatHistory: ChatHistory[];
    public initialPrompt: string;
    constructor(id: string, initialPrompt: string){
        this.id = id;
        this.initialPrompt = initialPrompt;
        this.chatHistory = [];
        this.readFromFile();
    }
    public addMessage(role: ChatCompletionRequestMessageRoleEnum, content: string) {
        this.chatHistory.push({role, content});
        this.writeToFile();
    }
    public forget() {
        this.chatHistory = [];
        this.writeToFile();
    }
    public getChatHistory() {
        return this.chatHistory;
    }
    public writeToFile() {
        fs.writeFileSync(`./memory/${this.id}.json`, JSON.stringify(this.chatHistory, null, 2));
    }
    public readFromFile() {
        try{
            const file = fs.readFileSync(`./memory/${this.id}.json`);
            this.chatHistory = JSON.parse(file.toString());
        } catch(error) {
            console.log(error);
            this.writeToFile();
        }
    }
}
