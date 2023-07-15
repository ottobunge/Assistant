import StableDiffusionApi from "../api.ts";
import { Sharp } from "sharp";
import { ControlNetUnit } from "stable-diffusion-api";

const CONTROL_NET_PREFIX = 'control_sd15_';


class ControlNetModule {
    public name: string;
    public model: string;
    public preprocessors: string[];
    constructor(model: string,  preprocessors: string[]) {
        this.model = model; // example model: control_sd15_canny
        this.name = model.replace(CONTROL_NET_PREFIX, '').split(' ')[0]; // example name: canny
        this.preprocessors = preprocessors.filter(preprocessor => preprocessor.startsWith(this.name));
    }
}


export class ControlNet {
    public modules: Record<string, ControlNetModule>;
    public units: Record<string, ControlNetUnit>;
    constructor() {
        this.modules = {};
        this.units = {};
        this.loadModules();
    }
    public async loadModules() {
        const models = (await StableDiffusionApi.ControlNet.getModels()).filter(model => model.startsWith(CONTROL_NET_PREFIX));
        const modules = await StableDiffusionApi.ControlNet.getModules();
        this.modules = models.reduce((acc, model) => ({
            ...acc,
            [model]: new ControlNetModule(model, modules),
        }), {});
        console.log(JSON.stringify(this.modules, null, 2));
    }
    public getControlNetUnit(name: string, image: Sharp, guidance: number, guidance_start: number, guidance_end: number, threshold_a: number, threshold_b: number, weight: number): ControlNetUnit | undefined {
        const module = this.modules[name];
        if(module !== undefined) {
            const unit = new ControlNetUnit({
                model: module.model,
                module: module.name,
                input_image: image,
                processor_res: 512,
                threshold_a,
                threshold_b,
                guidance,
                guidance_start,
                guidance_end,
                weight,
            });
            this.units[name] = unit;
            return unit;
        }
        return undefined;
    }
    public async detect(moduleName: string, preprocessor: string, image: Sharp, thresholdA: number, thresholdB: number){
        const module = this.modules[moduleName];
        if(module === undefined || !module.preprocessors.includes(preprocessor)) return undefined;
        return await StableDiffusionApi.ControlNet.detect({
            controlnet_module: preprocessor,
            controlnet_input_images: [image],
            controlnet_threshold_a: thresholdA,
            controlnet_threshold_b: thresholdB,
        });
    }
}