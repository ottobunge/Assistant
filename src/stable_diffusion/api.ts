import config from "../config.ts";
import { StableDiffusionApi } from "stable-diffusion-api";

export const api = new StableDiffusionApi({
    baseUrl: config.SD_API_HOST,
    defaultSampler: "Euler a",
    defaultStepCount: 20,
    timeout: 600000,
});

export default api;