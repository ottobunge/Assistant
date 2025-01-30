import fs from "fs";
import GPT from "../gpt.ts";
import { AgentManagerInterface, ConversationAgentsMapping, SavedConversationAgentsMapping } from "./types.ts";
import Memory, { defaultPrompt } from "../memory.ts";
import { AgentConfig } from "../agentConfig.ts";


export default class AgentManager implements AgentManagerInterface {
    private agents: ConversationAgentsMapping;
    constructor(){
        this.agents = {};
        this.readFromFile();
    }

    public agentExists(conversationId: string, agentId: string): boolean {
        return this.agents?.[conversationId]?.[agentId] !== undefined;
    }

    public getAgent(conversationId: string, agentId: string): GPT | undefined {
        if(this.agents?.[conversationId] === undefined) {
            this.agents[conversationId] = {};
        }
        if(this.agents[conversationId][agentId] === undefined && agentId === "default") {
            this.agents[conversationId][agentId] = this.createAgent(conversationId, agentId, defaultPrompt);
        }
        if(this.agents[conversationId][agentId] === undefined) {
            return undefined;
        }
        return this.agents[conversationId][agentId];
    }

    public createAgent(conversationId: string, agentId: string, initialPrompt: string): GPT {
        if(!this.agents?.[conversationId] === undefined) {
            this.agents[conversationId] = {};
        }
        const config = new AgentConfig(1.25, 1, 1.18, 0);
        this.agents[conversationId][agentId] = new GPT(new Memory(`${conversationId}-${agentId}`, initialPrompt), config);
        this.writeToFile();
        return this.agents[conversationId][agentId];
    }

    public getAgents(conversationId: string): string[] {
        return Object.keys(this.agents?.[conversationId] || {});
    }

    public updatePrompt(conversationId: string, agentId: string, prompt: string): void {
        this.getAgent(conversationId, agentId)?.updatePrompt(prompt);
        this.writeToFile();
    }

    public getPrompt(conversationId: string, agentId: string): string | undefined {
        return this.getAgent(conversationId, agentId)?.getInitialPrompt();
    }

    public writeToFile() {
        const savedAgents = Object.keys(this.agents).reduce((acc, conversationId) => ({
            ...acc,
            [conversationId]: Object.keys(this.agents[conversationId]).map(agentId => ({
                id: agentId,
                initialPrompt: this.agents[conversationId][agentId].getInitialPrompt(),
                config: this.agents[conversationId][agentId].getConfig(),
            })),
        }), {} as SavedConversationAgentsMapping);
        fs.writeFileSync(`./agents.json`, JSON.stringify(savedAgents, null, 2));
    }

    public readFromFile() {
        try{
            const file = fs.readFileSync(`./agents.json`);
            const savedAgents = JSON.parse(file.toString()) as SavedConversationAgentsMapping;
            this.agents = Object.keys(savedAgents).reduce((acc, conversationId) => ({
                ...acc,
                [conversationId]: savedAgents[conversationId].reduce((accAgent, {id, initialPrompt, config}) => ({
                    ...accAgent,
                    [id]: new GPT(new Memory(`${conversationId}-${id}`, initialPrompt), config),
                }), {})
            }), {} as ConversationAgentsMapping);

        } catch(error) {
            console.log(error);
            this.writeToFile();
        }
    }
}
