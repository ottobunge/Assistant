import qrcode from 'qrcode-terminal';
import WAWebJS from'whatsapp-web.js';
import ChatUserInterface from './cui.ts';
import AgentManager from './agent_manager/index.ts';
import { client } from './wapp.ts';
const seenMessages = new Set();
const agentManager = new AgentManager();
const cui = new ChatUserInterface(agentManager);

console.log('Starting...');
console.log('Client created!');
console.log('Initializing...');
const processMessage = (message: WAWebJS.Message) => {
    if (!seenMessages.has(message.id)) {
        seenMessages.add(message.id);
        cui.processMessage(message);
    }
}

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', message => {
    processMessage(message);
});
client.on('message_create', message => {
    processMessage(message);
});
client.initialize();
