import StableDiffusionApi from "./api.ts";


export class StableDiffusion {
    public async txt2img(prompt: string, negativePrompt = '', steps = 40) {
        return await StableDiffusionApi.txt2img({
            prompt,
            negative_prompt: negativePrompt,
            n_iter: steps,
        });
    }
}