import qrcode from 'qrcode-terminal';
import WAWebJS, { Client } from'whatsapp-web.js';
import ChatUserInterface from './cui.ts';
import AgentManager from './agent_manager.ts';
import {client} from './wapp.ts';
let seenMessages = new Set();
const agentManager = new AgentManager();
const cui = new ChatUserInterface(agentManager);

console.log('Starting...');

console.log('Client created!');
console.log('Initializing...');
const processMessage = (message: WAWebJS.Message) => {
    if (!seenMessages.has(message.id)) {
        console.log(JSON.stringify(message, null, 2));
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
