import WAWebJS, { Client } from'whatsapp-web.js';
export const client = new Client({
    authStrategy: new WAWebJS.LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox'],
        executablePath: '/usr/bin/google-chrome-stable',
    }
});