import StableDiffusionApi from "./api.ts";
import type { Sharp } from "sharp";

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

    public async img2img(
        prompt: string,
        initImage: Sharp,
        denoisingStrength: number,
        negativePrompt = '',
        steps = 40,
        width = 512,
        height = 512,
        cfgScale = 7
    ) {
        return await StableDiffusionApi.img2img({
            prompt,
            init_images: [initImage],
            negative_prompt: negativePrompt,
            denoising_strength: denoisingStrength,
            steps,
            cfg_scale: cfgScale,
            width,
            height,
        });
    }
}