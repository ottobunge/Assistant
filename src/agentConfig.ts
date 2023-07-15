export class AgentConfig {
    public temperature: number;
    public topP: number;
    public frequencyPenalty: number;
    public presencePenalty: number;
    public constructor(temperature: number, topP: number, frequencyPenalty: number, presencePenalty: number) {
        this.temperature = temperature;
        this.topP = topP;
        this.frequencyPenalty = frequencyPenalty;
        this.presencePenalty = presencePenalty;
    }
}
