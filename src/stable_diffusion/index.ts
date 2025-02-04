import StableDiffusionApi from "./api.ts";


export default class StableDiffusion {
    public async txt2img(prompt: string, negativePrompt = '', steps = 40, width = 512, height = 512, cfgScale = 7) {
        return await StableDiffusionApi.txt2img({
            prompt,
            negative_prompt: negativePrompt,
            steps,
            cfg_scale: cfgScale,
            width,
            height,
        });
    }
}