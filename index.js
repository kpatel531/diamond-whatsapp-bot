const { Client, LocalAuth, Poll } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// const restrictedNumber = "12019369649@c.us";
const restrictedNumber = "919537622610@c.us";
const currentState = [];

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');
    client.getChats().then(chats => {
        const chat = chats.find(chat => (chat.id._serialized) == restrictedNumber);
        // const lastMessage = chat.messages[chat.messages.length - 1];
        // console.log(chat);
    });
});

const setCurrentState = (chatId, state) => {
    currentState[chatId] = state;
}

const getCurrentState = (chatId) => {
    return currentState[chatId] || false;
}

const welcomeMsg = () => {
    return 'Hello Boss! I am Diamond Searching Bot Working for "Solitaire Lab"\n' +
    '\n'+
    'Welcome to Diamond Finder! 💎✨ Search for your dream diamond with us.';
}

const welcomePoll = () => {
    const question = 'What are you looking for?';
    const options = [
        'Do you want to filter diamonds?',
        'Do you want to talk with experts?'
    ];
    return new Poll(question, options, false);
}

client.on('message', async (message) => {

    if(message.from != restrictedNumber) {
        return;
    }

    console.log(message);

    switch(getCurrentState(message.from)) {
        case 'welcome':
            console.log('Welcome TODO for chnages');
        break;
        default:
            await client.sendMessage(message.from, welcomeMsg());
            await client.sendMessage(message.from, welcomePoll());
            setCurrentState(message.from, 'welcome');
        break;
    }
});

client.on('vote_update', async (vote) => {
    console.log(vote);
});

client.initialize();