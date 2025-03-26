import JSONStorage from "../storage/json_storage.ts";
import { StableDiffusionConfig } from "../types.ts";

export class StableDiffusionConfigManager {
    private static instance: StableDiffusionConfigManager;
    private storage: JSONStorage<Record<string, StableDiffusionConfig>>;
    private configs: Record<string, StableDiffusionConfig> = {};

    private constructor() {
        this.storage = new JSONStorage('./sd_configs.json');
        this.loadConfigs();
    }

    public static getInstance(): StableDiffusionConfigManager {
        if (!StableDiffusionConfigManager.instance) {
            StableDiffusionConfigManager.instance = new StableDiffusionConfigManager();
        }
        return StableDiffusionConfigManager.instance;
    }

    private loadConfigs() {
        try {
            this.configs = this.storage.readFromFile();
        } catch (error) {
            this.configs = {};
            this.saveConfigs();
        }
    }

    private saveConfigs() {
        this.storage.writeToFile(this.configs);
    }

    createConfig(chatId: string, userConfigId: string, config: Omit<StableDiffusionConfig, 'id'>) {
        const fullId = `${chatId}_${userConfigId}`;
        if (this.configs[fullId]) {
            throw new Error(`Config ${userConfigId} already exists in this chat`);
        }
        
        this.configs[fullId] = { ...config, id: userConfigId };
        this.saveConfigs();
        return this.configs[fullId];
    }

    updateConfig(chatId: string, userConfigId: string, update: Partial<StableDiffusionConfig>) {
        const fullId = `${chatId}_${userConfigId}`;
        // we check if they are looking for the default config and make sure its there
        if(userConfigId === 'default') {
            // we call getConfig to make sure the default config is created
            this.getDefaultConfig(chatId);
        }
        if (!this.configs[fullId]) {
            throw new Error(`Config ${userConfigId} not found in this chat`);
        }
        
        this.configs[fullId] = { 
            ...this.configs[fullId], 
            ...update,
            id: userConfigId // Maintain original user-facing ID
        };
        this.saveConfigs();
        return this.configs[fullId];
    }

    getConfig(chatId: string, userConfigId: string): StableDiffusionConfig | undefined {
        return this.configs[`${chatId}_${userConfigId}`];
    }

    getDefaultConfig(chatId: string): StableDiffusionConfig {
        const config = this.getConfig(chatId, 'default');
        if(!config) {
            return this.createConfig(chatId, 'default', {
                steps: 40,
                width: 1024,
                height: 1024,
                cfg: 5,
                negativePrompt: '',
                stylePrompt: 'SCORE_9,SCORE_8_UP,SCORE_8,SCORE_7_UP,SCORE_7'
            });
        }
        return config;
    }

    listConfigs(chatId: string): StableDiffusionConfig[] {
        return Object.entries(this.configs)
            .filter(([key]) => key.startsWith(`${chatId}_`))
            .map(([, config]) => config);
    }

    deleteConfig(chatId: string, userConfigId: string) {
        const fullId = `${chatId}_${userConfigId}`;
        delete this.configs[fullId];
        this.saveConfigs();
    }

    public static getFullConfigId(chatId: string, userConfigId: string): string {
        return `${chatId}_${userConfigId}`;
    }
}

export default StableDiffusionConfigManager.getInstance();