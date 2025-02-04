import Config from './config.ts';
import WAWebJS from'whatsapp-web.js';
import { client } from './wapp.ts';
import { COMMAND_TYPES, CommandMatcher } from './types.ts';
import type { CommandParameters } from './types.ts';
import GPT from 'gpt.ts';
import { ENV_VARS } from './config.ts';
import { MessageMedia } from 'whatsapp-web.js';
import StableDiffusion from './stable_diffusion/index.ts';
import StableDiffusionConfigManager from './stable_diffusion/configManager.ts';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs-extra';
import StableDiffusionApi from './stable_diffusion/api.ts';
import sharp from "sharp";
import axios, { AxiosResponse } from 'axios';
import { AxiosApiRawResponse } from 'stable-diffusion-api';

async function makeMessageString  (message: WAWebJS.Message, body: string) {
    const dateString = `Current Date: ${new Date().toLocaleDateString()}`;
    const timesString = `Current Time: ${new Date().toLocaleTimeString()}`;
    const contact = await message.getContact();
    const fromString = `From: ${contact.shortName || contact.pushname || contact.name  || message.from}`.replace(Config.OWN_PHONE_NUMBER, Config.OWNER);
    const bodyString = `Body: ${body}`;
    return [dateString, timesString, fromString, bodyString].join("\n")
}

export const availableCommands: CommandMatcher<COMMAND_TYPES>[] = []
availableCommands.push({
    command: COMMAND_TYPES.CHAT_AGENT,
    template: ['assistant <agentId> <...text>', 'assistant <...text>'],
    description: "Query an agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const maybeAgentId = availableAgentIds.find(agentId => textParts[1].includes(agentId.toLocaleLowerCase()));
        const agentId = maybeAgentId || Config.DEFAULT_AGENT_ID;
        const textToSend = maybeAgentId ? textParts.slice(2).join(' ') : textParts.slice(1).join(' ');
        return {
            agentId,
            text: textToSend,
        }
    },
    trigger: async (parameters, agentManager, message) => {
        message.reply(`🤖:\nProcessing...`);
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const queryAgent = agentManager.getAgent(conversationId, parameters.agentId);
        const query = await makeMessageString(message, parameters.text);
        let participants: string[] = [];
        const groupCHAT = chat as WAWebJS.GroupChat;
        if(chat.isGroup){
            console.log("Getting group chat participants")
            const groupCHAT = chat as WAWebJS.GroupChat;
            participants = await Promise.all(groupCHAT.participants.map(async participant => {
                const contact = (await client.getContactById(participant.id._serialized));
                const name = (contact.name || contact.pushname || contact.shortName || participant.id._serialized).trim();
                const isMe = name === 'Yo' || contact?.number?.includes(Config.OWN_PHONE_NUMBER) || contact.isMe;
                if(isMe) {
                    return Config.OWNER;
                }
                return name;
            }));
        } else {
            const contact = await message.getContact();
            participants = [contact.pushname || contact.name || contact.shortName || contact.id._serialized];
        }
        if(queryAgent !== undefined){
            try {
                const response = (await queryAgent.chat(query, participants)).trim();
                const nameString = parameters.agentId === 'default' ? '🤖:' : `🤖 ${parameters.agentId}:\n`;
                message.reply(`${nameString}\n${response}`);
                return true;
            }catch(error){
                message.reply("There was an error processing your request.");
            }
        } else {
            message.reply(`🤖:\nNo agent named ${parameters.agentId} exists!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.CHAT_AGENT>);
availableCommands.push({
    command: COMMAND_TYPES.DELETE_AGENT_HISTORY,
    template: '/agent <agentId> forget history',
    description: "Delete the chat history of an agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = availableAgentIds.find(agentId => textParts[1].includes(agentId.toLocaleLowerCase()));
        return {
            agentId,
        }
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const deleteAgentName = parameters.agentId;
        const deleteMemoryAgent = agentManager.getAgent(conversationId, parameters.agentId);
        if(deleteMemoryAgent !== undefined){
            deleteMemoryAgent.forget();
            message.reply(`🤖:\nDeleted agent ${deleteAgentName} memory!`);
            return true;
        } else {
            message.reply(`🤖:\nAgent ${deleteAgentName} does not exist!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.DELETE_AGENT_HISTORY>);
availableCommands.push({
    command: COMMAND_TYPES.RELOAD_AGENT_MEMORY,
    template: '/agent <agentId> reload history',
    description: "Reload the chat history of an agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = availableAgentIds.find(agentId => textParts[1].includes(agentId.toLocaleLowerCase()));
        return {
            agentId,
        }
    },
    trigger: async(parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const reloadAgentName = parameters.agentId;
        const reloadMemoryAgent = agentManager.getAgent(conversationId, parameters.agentId);
        if(reloadMemoryAgent !== undefined){
            reloadMemoryAgent.reloadMemory();
            message.reply(`🤖:\nReloaded agent ${reloadAgentName} memory!`);
            return true;
        } else {
            message.reply(`🤖:\nAgent ${reloadAgentName} does not exist!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.RELOAD_AGENT_MEMORY>);
availableCommands.push({
    command: COMMAND_TYPES.LIST_AGENTS,
    template: '/agent list',
    description: "List all available chat agents.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        return undefined;
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const agents = agentManager.getAgents(conversationId)
        message.reply(`🤖:\n\t${agents.join('\n\t')}`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.LIST_AGENTS>);

availableCommands.push({
    command: COMMAND_TYPES.CREATE_AGENT,
    template: '/agent create <agent_id> <...prompt>',
    description: "Create a new chat agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = textParts[2];
        return {
            agentId,
            prompt: textParts.slice(3).join(' '),
        };
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const newAgentName = parameters.agentId;
        const initialPrompt = parameters.prompt;
        if(!agentManager.agentExists(conversationId, newAgentName)){
            const agent = agentManager.createAgent(conversationId, newAgentName, initialPrompt);
            if(agent !== undefined){
                message.reply(`🤖:\nCreated agent ${newAgentName}!\nInitial Prompt: ${initialPrompt}`);
                return true;
            }
        } else {
            message.reply(`🤖:\nAgent ${newAgentName} already exists!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.CREATE_AGENT>);
availableCommands.push({
    command: COMMAND_TYPES.MODIFY_AGENT,
    template: '/agent modify <agent_id> <...prompt>',
    description: "Modify an existing chat agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = availableAgentIds.find(agentId => textParts[2].includes(agentId.toLocaleLowerCase()));
        return {
            agentId,
            prompt: textParts.slice(3).join(' '),
        };
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const modifyAgentName = parameters.agentId;
        const modifiedPrompt = parameters.prompt;
        if(agentManager.agentExists(conversationId, modifyAgentName)){
            agentManager.updatePrompt(conversationId, modifyAgentName, modifiedPrompt);
            message.reply(`🤖:\nUpdated agent ${modifyAgentName}!\nNew Prompt: ${modifiedPrompt}`);
            return true;
        } else {
            message.reply(`🤖:\nAgent ${modifyAgentName} does not exist!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.MODIFY_AGENT>);
availableCommands.push({
    command: COMMAND_TYPES.GET_AGENT,
    template: '/agent get <agentId>',
    description: "Get the initial prompt and model for an existing chat agent.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = availableAgentIds.find(agentId => textParts[2].includes(agentId.toLocaleLowerCase()));
        return {
            agentId,
        };
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = (chat).id._serialized;
        const getAgentName = parameters.agentId;
        if(agentManager.agentExists(conversationId, getAgentName)){
            const agent = agentManager.getAgent(conversationId, getAgentName) as GPT;
            const prompt = agentManager.getPrompt(conversationId, getAgentName);
            const config = Object.entries(agent.getConfig()).map(([key, value]) => `${key}: ${value}`).join('\n\t');
            message.reply(`🤖:\nAgent ${getAgentName}!\nPrompt: ${prompt}\nConfig:\n\t${config}`);
            return true;
        } else {
            message.reply(`🤖:\nAgent ${getAgentName} does not exist!`);
        }
        return false;
    }
} as CommandMatcher<COMMAND_TYPES.GET_AGENT>);
availableCommands.push({
    command: COMMAND_TYPES.MODIFY_AGENT_CONFIG,
    template: '/agent set <agentId> <setting1=value> <setting2=value>...',
    description: "Modify agent parameters (temperature, topP, frequencyPenalty, presencePenalty)",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        const textParts = text.toLocaleLowerCase().split(' ');
        const agentId = availableAgentIds.find(agentId => textParts[2].includes(agentId.toLocaleLowerCase()));
        const settings = textParts.slice(3).map(part => {
            const [attribute, value] = part.split('=');
            return { attribute, value: Number(value) };
        });
        return {
            agentId,
            settings
        };
    },
    trigger: async (parameters, agentManager, message) => {
        const chat = await message.getChat();
        const conversationId = chat.id._serialized;
        const getAgentName = parameters.agentId;
        
        if (!agentManager.agentExists(conversationId, getAgentName)) {
            message.reply(`🤖:\nAgent ${getAgentName} does not exist!`);
            return false;
        }

        const agent = agentManager.getAgent(conversationId, getAgentName) as GPT;
        const validAttributes = ['temperature', 'topP', 'frequencyPenalty', 'presencePenalty'];
        const results: string[] = [];

        for (const setting of parameters.settings) {
            const { attribute, value } = setting;
            
            if (!validAttributes.includes(attribute)) {
                results.push(`❌ Invalid attribute: ${attribute}\nValid attributes: ${validAttributes.join(', ')}`);
                continue;
            }

            if (isNaN(value)) {
                results.push(`❌ Invalid value for ${attribute}: Not a number`);
                continue;
            }

            switch(attribute) {
                case 'temperature':
                    agent.setTemperature(value);
                    break;
                case 'topP':
                    agent.setTopP(value);
                    break;
                case 'frequencyPenalty':
                    agent.setFrequencyPenalty(value);
                    break;
                case 'presencePenalty':
                    agent.setPresencePenalty(value);
                    break;
            }
            results.push(`✅ Set ${attribute} to ${value}`);
        }

        if (results.some(r => r.startsWith('✅'))) {
            agentManager.writeToFile();
        }

        message.reply(`🤖:\n${results.join('\n')}`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.MODIFY_AGENT_CONFIG>);
availableCommands.push({
    command: COMMAND_TYPES.HELP,
    template: '/agent help',
    description: "List all available commands commands.",
    getCommandParameters: (text: string, availableAgentIds: string[]) => {
        return undefined;
    },
    trigger: async (parameters, agentManager, message) => {
        const helpString = availableCommands.map((command) => {
            const templateString = typeof command.template === 'string' ? command.template : command.template.join(' | ');
            return `${command.command}:\n\tDescription: ${command.description}\n\tUsage: ${templateString}`;
        }).join('\n');
        message.reply(`🤖:\n${helpString}`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.HELP>);
availableCommands.push({
    command: COMMAND_TYPES.UPDATE_CONFIG,
    template: '/config set <key> <value>',
    description: "[Owner] Update runtime config values. Valid keys: OPENAI_API_HOST, MODEL, SD_API_HOST",
    getCommandParameters: (text: string) => {
        const textParts = text.split(' ');
        return {
            key: textParts[2],
            value: textParts.slice(3).join(' ')
        };
    },
    trigger: async (parameters, _, message) => {
        const contact = await message.getContact();
        const isOwner = contact.number.includes(Config.OWN_PHONE_NUMBER);
        
        if (!isOwner) {
            message.reply("🤖:\nThis command is only available for the owner!");
            return false;
        }

        const validKeys = [
            ENV_VARS.OPENAI_API_HOST, 
            ENV_VARS.MODEL, 
            ENV_VARS.SD_API_HOST
        ];
        if (!validKeys.includes(parameters.key)) {
            message.reply(`🤖:\nInvalid config key! Valid keys: ${validKeys.join(', ')}`);
            return false;
        }

        // Only update runtime configuration
        process.env[parameters.key] = parameters.value;
        Config[parameters.key] = parameters.value;
        
        message.reply(`🤖:\nUpdated ${parameters.key} to: ${parameters.value}\nNote: Changes are temporary and will reset on restart`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.UPDATE_CONFIG>);
availableCommands.push({
    command: COMMAND_TYPES.PRINT_CONFIG,
    template: '/config print',
    description: "[Owner] Show current API configurations",
    getCommandParameters: () => undefined,
    trigger: async (_, __, message) => {
        const contact = await message.getContact();
        const isOwner = contact.number.includes(Config.OWN_PHONE_NUMBER);
        if (!isOwner) {
            message.reply("🤖:\nThis command is only available for the owner!");
            return false;
        }

        const configValues = [
            `${ENV_VARS.OPENAI_API_HOST}: ${Config.OPENAI_API_HOST}`,
            `${ENV_VARS.MODEL}: ${Config.MODEL}`,
            `${ENV_VARS.SD_API_HOST}: ${Config.SD_API_HOST}`
        ].join('\n');

        message.reply(`🤖:\nCurrent Configuration:\n${configValues}`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.PRINT_CONFIG>);
availableCommands.push({
    command: COMMAND_TYPES.STABLE_DIFFUSION,
    template: ['/sd <configId> <...prompt>', '/sd <...prompt>'],
    description: "Generate image from text",
    getCommandParameters: (text: string) => {
        const textParts = text.split(' ');
        const configId = textParts[1] === 'default' ? 'default' : textParts[1];
        
        let promptParts = textParts.slice(textParts[1] === 'default' ? 2 : 1);
        const params: any = {};
        let negativePromptParts: string[] = [];
        let parsingNegative = false;

        promptParts = promptParts.filter(part => {
            if (part === '-neg' || part === '--negative') {
                parsingNegative = true;
                return false;
            }

            if (parsingNegative) {
                if (part.match(/^(steps|cfg|width|height)=/)) {
                    parsingNegative = false;
                    const match = part.match(/(\w+)=(\d+)/);
                    if (match) {
                        params[match[1]] = Number(match[2]);
                    }
                    return false;
                }
                negativePromptParts.push(part);
                return false;
            }

            const match = part.match(/(steps|cfg|width|height)=(\d+)/);
            if (match) {
                params[match[1]] = Number(match[2]);
                return false;
            }
            return true;
        });

        return {
            configId,
            prompt: promptParts.join(' '),
            negativePrompt: negativePromptParts.join(' ') || undefined,
            ...params
        };
    },
    trigger: async (parameters, _, message) => {
        const chat = await message.getChat();
        const config = StableDiffusionConfigManager.getConfig(chat.id._serialized, parameters.configId) || 
                       StableDiffusionConfigManager.getDefaultConfig(chat.id._serialized);
        
        if (!Config.SD_API_HOST) {
            message.reply("🤖:\nStable Diffusion API host not configured!");
            return false;
        }

        message.reply("🤖:\nGenerating image...");
        let prompt = parameters.prompt;
        if(config.stylePrompt !== '') {
            prompt = `${config.stylePrompt}\n${prompt}`;
        }
        try {
            const sd = new StableDiffusion();
            const response = await sd.txt2img(
                prompt,
                parameters.negativePrompt || config.negativePrompt,
                parameters.steps || config.steps,
                parameters.width || config.width,
                parameters.height || config.height,
                parameters.cfgScale || config.cfgScale
            );

            if (response?.images?.[0]) {
                const outputDir = path.join('output', chat.id._serialized);
                await fs.ensureDir(outputDir);
                
                const imageId = uuidv4();
                const imagePath = path.join(outputDir, `${imageId}.png`);
                
                await response.images[0].toFile(imagePath);
                const media = await MessageMedia.fromFilePath(imagePath);
                
                // Add parameters to caption
                const parametersText = [
                    `Prompt: ${prompt}`,
                    `Negative: ${parameters.negativePrompt || config.negativePrompt}`,
                    `Steps: ${parameters.steps || config.steps}`,
                    `CFG: ${parameters.cfgScale || config.cfgScale}`,
                    `Size: ${parameters.width || config.width}x${parameters.height || config.height}`
                ].join('\n');

                message.reply(media, undefined, { caption: parametersText });
            } else {
                message.reply("🤖:\nNo image generated");
            }
        } catch (error) {
            console.error('SD Error:', error);
            message.reply("🤖:\nFailed to generate image");
        }
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.STABLE_DIFFUSION>);
availableCommands.push({
    command: COMMAND_TYPES.SD_CREATE_CONFIG,
    template: '/sd-config create <configId> steps=<steps> width=<width> height=<height> cfg=<cfgScale> negPrompt=<...negativePrompt>',
    description: "Create new SD config",
    getCommandParameters: (text: string) => {
        const textParts = text.split(' ');
        const configId = textParts[2];
        const params = textParts.slice(3).join(' ');

        const steps = Number(params.match(/steps=(\d+)/)?.[1] || 20);
        const width = Number(params.match(/width=(\d+)/)?.[1] || 512);
        const height = Number(params.match(/height=(\d+)/)?.[1] || 512);
        const cfgScale = Number(params.match(/cfg=(\d+)/)?.[1] || 7);
        const negativePrompt = params.match(/negPrompt=(.+)/)?.[1] || '';
        const stylePrompt = params.match(/stylePrompt=(.+)/)?.[1] || '';
        return { configId, steps, width, height, cfgScale, negativePrompt, stylePrompt };
    },
    trigger: async (parameters, _, message) => {
        const chat = await message.getChat();
        StableDiffusionConfigManager.createConfig(
            chat.id._serialized,
            parameters.configId,
            {
                steps: parameters.steps,
                width: parameters.width,
                height: parameters.height,
                cfgScale: parameters.cfgScale,
                negativePrompt: parameters.negativePrompt,
                stylePrompt: parameters.stylePrompt,
            }
        );
        message.reply(`🤖:\nCreated SD config ${parameters.configId}`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.SD_CREATE_CONFIG>);
availableCommands.push({
    command: COMMAND_TYPES.SD_LIST_CONFIGS,
    template: '/sd-config list',
    description: "List available SD configs",
    getCommandParameters: () => undefined,
    trigger: async (_, __, message) => {
        const chat = await message.getChat();
        const configs = StableDiffusionConfigManager.listConfigs(chat.id._serialized);
        const configsString = configs.map(c => 
            `${c.id}: ${c.width}x${c.height} steps=${c.steps} cfg=${c.cfgScale}`
        ).join('\n');
        message.reply(`🤖:\nSD Configs:\n${configsString}`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.SD_LIST_CONFIGS>);
availableCommands.push({
    command: COMMAND_TYPES.SD_UPDATE_CONFIG,
    template: '/sd-config update <configId> [steps=<steps>] [width=<width>] [height=<height>] [cfg=<cfgScale>] [negPrompt=<...negativePrompt>] [stylePrompt=<...stylePrompt>]',
    description: "Update existing SD config",
    getCommandParameters: (text: string) => {
        const textParts = text.split(' ');
        const configId = textParts[2];
        const params = textParts.slice(3).join(' ');

        return {
            configId,
            updates: {
                steps: params.match(/steps=(\d+)/)?.[1] ? Number(params.match(/steps=(\d+)/)?.[1]) : undefined,
                width: params.match(/width=(\d+)/)?.[1] ? Number(params.match(/width=(\d+)/)?.[1]) : undefined,
                height: params.match(/height=(\d+)/)?.[1] ? Number(params.match(/height=(\d+)/)?.[1]) : undefined,
                cfgScale: params.match(/cfg=(\d+)/)?.[1] ? Number(params.match(/cfg=(\d+)/)?.[1]) : undefined,
                negativePrompt: params.match(/negPrompt=(.+)/)?.[1] ? params.match(/negPrompt=(.+)/)?.[1] : undefined,
                stylePrompt: params.match(/stylePrompt=(.+)/)?.[1] ? params.match(/stylePrompt=(.+)/)?.[1] : undefined
            }
        };
    },
    trigger: async (parameters, _, message) => {
        const chat = await message.getChat();
        
        // Filter out undefined updates
        const filteredUpdates = {
            steps: parameters.updates.steps,
            width: parameters.updates.width,
            height: parameters.updates.height,
            cfgScale: parameters.updates.cfgScale,
            negativePrompt: parameters.updates.negativePrompt,
            stylePrompt: parameters.updates.stylePrompt
        };
        
        // Remove undefined values
        const cleanUpdates = Object.fromEntries(
            Object.entries(filteredUpdates).filter(([_, v]) => v !== undefined)
        );

        const updatedConfig = StableDiffusionConfigManager.updateConfig(
            chat.id._serialized,
            parameters.configId,
            cleanUpdates
        );
        message.reply(`🤖:\nUpdated config ${parameters.configId}:\n${
            Object.entries(updatedConfig)
                .map(([k, v]) => `${k}: ${v}`)
                .join('\n')
        }`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.SD_UPDATE_CONFIG>);
availableCommands.push({
    command: COMMAND_TYPES.SD_SHOW_CONFIG,
    template: '/sd-config show <configId>',
    description: "Show details of a specific SD config",
    getCommandParameters: (text: string) => {
        const textParts = text.split(' ');
        return {
            configId: textParts[2]
        };
    },
    trigger: async (parameters, _, message) => {
        const chat = await message.getChat();
        const config = StableDiffusionConfigManager.getConfig(chat.id._serialized, parameters.configId);
        
        if (!config) {
            message.reply(`🤖:\nSD config ${parameters.configId} not found!`);
            return false;
        }

        const configDetails = [
            `ID: ${config.id}`,
            `Steps: ${config.steps}`,
            `Resolution: ${config.width}x${config.height}`,
            `CFG Scale: ${config.cfgScale}`,
            `Negative Prompt: ${config.negativePrompt || 'None'}`,
            `Style Prompt: ${config.stylePrompt || 'None'}`
        ].join('\n');

        message.reply(`🤖:\nSD Config Details:\n${configDetails}`);
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.SD_SHOW_CONFIG>);
availableCommands.push({
    command: COMMAND_TYPES.SD_LIST_MODELS,
    template: '/sd-models list',
    description: "[Owner] List available Stable Diffusion models",
    getCommandParameters: () => undefined,
    trigger: async (_, __, message) => {
        const contact = await message.getContact();
        const isOwner = contact.number.includes(Config.OWN_PHONE_NUMBER);
        if (!isOwner) {
            message.reply("🤖:\nThis command is only available for the owner!");
            return false;
        }

        try {
            await StableDiffusionApi.refreshCheckpoints();
            const models = await StableDiffusionApi.getSdModels();
            const modelList = models.map(m => m.model_name).join('\n');
            message.reply(`🤖:\nAvailable SD Models:\n${modelList}`);
            return true;
        } catch (error) {
            message.reply("🤖:\nFailed to fetch models");
            return false;
        }
    }
} as CommandMatcher<COMMAND_TYPES.SD_LIST_MODELS>);
availableCommands.push({
    command: COMMAND_TYPES.SD_SET_MODEL,
    template: '/sd-models set <modelName>',
    description: "[Owner] Set the active Stable Diffusion model",
    getCommandParameters: (text: string) => {
        const textParts = text.split(' ');
        return { modelName: textParts.slice(2).join(' ') };
    },
    trigger: async (parameters, _, message) => {
        const contact = await message.getContact();
        const isOwner = contact.number.includes(Config.OWN_PHONE_NUMBER);
        if (!isOwner) {
            message.reply("🤖:\nThis command is only available for the owner!");
            return false;
        }

        try {
            const settingMessage = message.reply(`🤖:\nSetting model to: ${parameters.modelName}`);
            await StableDiffusionApi.setModel(parameters.modelName, true);
            (await settingMessage).reply(`🤖:\nModel set to: ${parameters.modelName}`);
            return true;
        } catch (error) {
            message.reply(`🤖:\nFailed to set model: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
} as CommandMatcher<COMMAND_TYPES.SD_SET_MODEL>);

async function getCivitaiInfo(hash: string): Promise<string> {
    try {
        const response = await axios.get<CivitaiModelVersion>(
            `https://civitai.com/api/v1/model-versions/by-hash/${hash}`
        );
        const modelData = response.data;
        
        return [
            `CivitAI Name: ${modelData.model?.name || 'Unknown'}`,
            `Version: ${modelData.name}`,
            `Base Model: ${modelData.baseModel}`,
            `Rating: ${modelData.stats?.rating.toFixed(1) || 'N/A'}`,
            `Description: ${modelData.description || 'No description available'}`,
            `Training Status: ${modelData.trainingStatus || 'N/A'}`,
            `Trained Words: ${modelData.trainedWords.join(', ') || 'N/A'}`,
            `Training Details: ${modelData.trainingDetails || 'N/A'}`
        ].join('\n');
        
    } catch (error) {
        console.error('CivitAI API error:', error);
        return '[Could not fetch CivitAI info]';
    }
}

availableCommands.push({
    command: COMMAND_TYPES.SD_CURRENT_MODEL,
    template: '/sd-models current',
    description: "Show current Stable Diffusion model",
    getCommandParameters: () => undefined,
    trigger: async (_, __, message) => {
        try {
            const currentModel = await StableDiffusionApi.getCurrentModel();
            const models = await StableDiffusionApi.getSdModels();
            const model = models.find(m => m.model_name === currentModel.split(' ')[0].split('.safetensors')[0]);
            const modelHash = model?.hash;
            
            let civitaiInfo = '';
            if (modelHash) {
                civitaiInfo = await getCivitaiInfo(modelHash);
            }

            message.reply(`🤖:\nCurrent SD Model: ${currentModel}\n${civitaiInfo}`);
            return true;
        } catch (error) {
            message.reply("🤖:\nFailed to fetch current model");
            return false;
        }
    }
} as CommandMatcher<COMMAND_TYPES.SD_CURRENT_MODEL>);

availableCommands.push({
    command: COMMAND_TYPES.SD_IMG2IMG,
    template: ['/img2img <denoising_strength> <...prompt>'],
    description: "Generate image from image (add params like steps=20 cfg=7 width=512 height=512 -neg 'negative prompt')",
    getCommandParameters: (text: string) => {
        const textParts = text.split(' ');
        const denoisingStrength = parseFloat(textParts[1]);
        
        let promptParts = textParts.slice(2);
        const params: any = {};
        let negativePromptParts: string[] = [];
        let parsingNegative = false;

        promptParts = promptParts.filter(part => {
            if (part === '-neg' || part === '--negative') {
                parsingNegative = true;
                return false;
            }

            if (parsingNegative) {
                if (part.match(/^(steps|cfg|width|height)=/)) {
                    parsingNegative = false;
                    const match = part.match(/(\w+)=(\d+)/);
                    if (match) {
                        params[match[1]] = Number(match[2]);
                    }
                    return false;
                }
                negativePromptParts.push(part);
                return false;
            }

            const match = part.match(/(steps|cfg|width|height)=(\d+)/);
            if (match) {
                params[match[1]] = Number(match[2]);
                return false;
            }
            return true;
        });

        return {
            configId: 'default',
            denoisingStrength: isNaN(denoisingStrength) ? 0.75 : denoisingStrength,
            prompt: promptParts.join(' '),
            negativePrompt: negativePromptParts.join(' ') || undefined,
            ...params
        };
    },
    trigger: async (parameters, _, message) => {
        if (!message.hasMedia) {
            message.reply("🤖:\nPlease attach an image with this command!");
            return false;
        }

        const media = await message.downloadMedia();
        const chat = await message.getChat();
        const config = StableDiffusionConfigManager.getConfig(chat.id._serialized, parameters.configId) || 
                       StableDiffusionConfigManager.getDefaultConfig(chat.id._serialized);
        let imgBuffer = Buffer.from(media.data, 'base64');
        const initImage = sharp(imgBuffer);
        const metadata = await initImage.metadata();
        const originalWidth = metadata.width || config.width;
        const originalHeight = metadata.height || config.height;

        // Calculate original aspect ratio
        const originalAspectRatio = originalWidth / originalHeight;

        // Get target dimensions from parameters or config
        let targetWidth = parameters.width || config.width;
        let targetHeight = parameters.height || config.height;

        // Calculate target aspect ratio
        const targetAspectRatio = targetWidth / targetHeight;

        // Adjust dimensions to maintain original aspect ratio
        if (originalAspectRatio > targetAspectRatio) {
            // Original is wider - constrain by width
            targetHeight = Math.round(targetWidth / originalAspectRatio);
        } else {
            // Original is taller - constrain by height
            targetWidth = Math.round(targetHeight * originalAspectRatio);
        }

        // Resize with exact dimensions
        const resizedImage = initImage.resize(targetWidth, targetHeight, {
            fit: 'inside' // Ensures exact dimensions are used
        });

        message.reply("🤖:\nGenerating image...");
        try {
            const sd = new StableDiffusion();
            const response = await sd.img2img(
                parameters.prompt,
                resizedImage,
                parameters.denoisingStrength,
                parameters.negativePrompt || config.negativePrompt,
                parameters.steps || config.steps,
                targetWidth,
                targetHeight,
                parameters.cfgScale || config.cfgScale
            );

            if (response?.images?.[0]) {
                const outputDir = path.join('output', chat.id._serialized);
                await fs.ensureDir(outputDir);
                
                const imageId = uuidv4();
                const imagePath = path.join(outputDir, `${imageId}.png`);
                
                await response.images[0].toFile(imagePath);
                const replyMedia = await MessageMedia.fromFilePath(imagePath);
                
                // Add parameters to caption
                const parametersText = [
                    `Prompt: ${parameters.prompt}`,
                    `Negative: ${parameters.negativePrompt || config.negativePrompt}`,
                    `Steps: ${parameters.steps || config.steps}`,
                    `CFG: ${parameters.cfgScale || config.cfgScale}`,
                    `Size: ${targetWidth}x${targetHeight}`,
                    `Denoising: ${parameters.denoisingStrength}`
                ].join('\n');

                message.reply(replyMedia, undefined, { caption: parametersText });
            } else {
                message.reply("🤖:\nNo image generated");
            }
        } catch (error) {
            console.error('Img2Img Error:', error);
            message.reply("🤖:\nFailed to generate image");
        }
        return true;
    }
} as CommandMatcher<COMMAND_TYPES.SD_IMG2IMG>);

availableCommands.push({
    command: COMMAND_TYPES.SD_QUERY_MODEL,
    template: '/sd-models query <modelName>',
    description: "Query CivitAI information for a specific model",
    getCommandParameters: (text: string) => {
        const textParts = text.split(' ');
        return { modelName: textParts.slice(2).join(' ') };
    },
    trigger: async (parameters, _, message) => {
        try {
            const models = await StableDiffusionApi.getSdModels();
            const model = models.find(m => 
                m.model_name.toLowerCase().includes(parameters.modelName.toLowerCase())
            );

            if (!model) {
                message.reply(`🤖:\nModel "${parameters.modelName}" not found`);
                return false;
            }

            let civitaiInfo = '';
            if (model.hash) {
                civitaiInfo = `Model: ${model.model_name}\n${await getCivitaiInfo(model.hash)}`;
            } else {
                civitaiInfo = '[No hash available for this model]';
            }

            message.reply(`🤖:\nModel Information:\n${civitaiInfo}`);
            return true;
        } catch (error) {
            console.error('Model query error:', error);
            message.reply("🤖:\nFailed to query model information");
            return false;
        }
    }
} as CommandMatcher<COMMAND_TYPES.SD_QUERY_MODEL>);

availableCommands.push({
    command: COMMAND_TYPES.SD_INTERROGATE,
    template: ['/sd-interrogate <deepbooru|clip>'],
    description: "Analyze image and generate tags/description",
    getCommandParameters: (text: string) => {
        const textParts = text.split(' ');
        const interrogator = textParts[1].toLowerCase() as 'deepbooru' | 'clip';
        
        return {
            interrogator
        };
    },
    trigger: async (parameters, _, message) => {
        if (!message.hasMedia) {
            message.reply("🤖:\nPlease attach an image with this command!");
            return false;
        }

        try {
            const media = await message.downloadMedia();
            const imgBuffer = Buffer.from(media.data, 'base64');
            const image = sharp(imgBuffer);

            message.reply("🤖:\nAnalyzing image...");
            
            const response = await StableDiffusionApi.interrogate(image, parameters.interrogator);

            const result = response.response.data as {caption:string};
            message.reply(`🤖:\nAnalysis results (${parameters.interrogator}):\n${result.caption}`);
            return true;
            
        } catch (error) {
            console.error('Interrogate error:', error);
            message.reply("🤖:\nFailed to analyze image");
            return false;
        }
    }
} as CommandMatcher<COMMAND_TYPES.SD_INTERROGATE>);

type CivitaiModelVersion = {
  id: number;
  modelId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  publishedAt: string;
  trainedWords: string[];
  trainingStatus: string | null;
  trainingDetails: string | null;
  baseModel: string;
  baseModelType: string;
  earlyAccessEndsAt: string | null;
  earlyAccessConfig: string | null;
  description: string | null;
  uploadType: string;
  usageControl: string;
  air: string;
  stats: CivitaiModelStats;
  model: {
    name: string;
    type: string;
    nsfw: boolean;
    poi: boolean;
  };
  files: CivitaiModelFile[];
  images: CivitaiModelImage[];
  downloadUrl: string;
};

type CivitaiModelStats = {
  downloadCount: number;
  ratingCount: number;
  rating: number;
  thumbsUpCount: number;
};

type CivitaiModelFile = {
  id: number;
  sizeKB: number;
  name: string;
  type: string;
  pickleScanResult: string;
  pickleScanMessage: string | null;
  virusScanResult: string;
  virusScanMessage: null;
  scannedAt: string;
  metadata: {
    format: string;
    size: string;
    fp: string;
  };
  hashes: Record<string, string>;
  primary: boolean;
  downloadUrl: string;
};

type CivitaiModelImage = {
  url: string;
  nsfwLevel: number;
  width: number;
  height: number;
  hash: string;
  type: string;
  metadata: {
    hash: string;
    size: number;
    width: number;
    height: number;
  };
  meta: {
    VAE?: string;
    Size?: string;
    seed?: number;
    Model?: string;
    steps?: number;
    hashes?: Record<string, string>;
    prompt?: string;
    Version?: string;
    sampler?: string;
    cfgScale?: number;
    clipSkip?: number;
    resources?: Array<{
      hash: string;
      name: string;
      type: string;
    }>;
    [key: string]: any; // For additional dynamic properties
  };
  availability: string;
  hasMeta: boolean;
  hasPositivePrompt: boolean;
  onSite: boolean;
  remixOfId: null;
};

export default availableCommands;
