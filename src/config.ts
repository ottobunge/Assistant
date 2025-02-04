import * as dotenv from 'dotenv';
dotenv.config();

export enum ENV_VARS {
    OPENAI_API_KEY = 'OPENAI_API_KEY',
    OWN_PHONE_NUMBER = 'OWN_PHONE_NUMBER',
    OWNER = 'OWNER',
    MODEL = 'MODEL',
    DEFAULT_AGENT_ID = 'DEFAULT_AGENT_ID',
    SD_API_HOST = 'SD_API_HOST',
    OPENAI_API_HOST = 'OPENAI_API_HOST',
}

const defaults: {
    [key: string]: string;
} = {
    [ENV_VARS.MODEL]: 'gpt-3.5-turbo-16k-0613',
    [ENV_VARS.DEFAULT_AGENT_ID]: 'default',
    [ENV_VARS.OPENAI_API_HOST]: 'https://api.openai.com/v1/',
}

type Config = Record<ENV_VARS, string>;

// Load config from environment variables
// Throws an error if any of the variables are missing
const loadConfig = () => {
    const loadedVars = Object.values(ENV_VARS).reduce((acc, curr) => {
        const value = process.env[curr] ?? defaults[curr];
        if (value === undefined) {
            throw new Error(`Environment variable ${curr} is missing`)
        }
        return {
            ...acc,
            [curr]: value,
        }
    }, {} as Config)
    return loadedVars;
}

export default loadConfig();
