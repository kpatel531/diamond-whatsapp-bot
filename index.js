require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json())

const port = process.env.PORT;
const phoneNumberId = process.env.RECIPIENT_WAID;
const version = process.env.VERSION;
const token = process.env.ACCESS_TOKEN;
const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

const currentState = [];
const chatFilterData = [];

const setCurrentState = (chatId, action) => {
    currentState[chatId] = action;
}

const getCurrentState = (chatId) => {
    return currentState[chatId] || false;
}

const setFilterData = (chatId, data) => {
    chatFilterData[chatId] = data;
}

const getFilterData = (chatId) => {
    return chatFilterData[chatId] || [];
}

app.listen(port, () => {
    console.log(`Sltrld whatsapp bot running on:. http://localhost:${port}`);
});

// Verify webhook token
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('Webhook verified!');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Callable webhook for communication
app.post('/webhook', async (req, res) => {
    const data = req.body;

    if (data.object) {
        if (data.entry && data.entry[0].changes && data.entry[0].changes[0].value.messages) {
            const message = data.entry[0].changes[0].value.messages[0];
            const sender = message.from;

            await sendMessage(sender, message);
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Function to send messages via WhatsApp API
sendMessage = async (sender, message) => {
    console.log(sender);
    console.log(message);

    if(!getCurrentState(sender)) {
        setCurrentState(sender, 'inital');
    }

    console.log(getCurrentState(sender));

    switch(getCurrentState(sender)) {
        case 'welcome':
            console.log("welcome");
        break;
        case 'formfill':
            console.log("formfill");
        break;
        case 'errormsg':
            console.log('errormsg is happen.....!');
        break;
        default:
            await welcomeMsg(sender);
        break;
    }
}

const welcomeMsg = async (sender) => {
    const msg = 'Hello Boss! I am Diamond Searching Bot Working for "Solitaire Lab"\n' +
    '\n'+
    'Welcome to Diamond Finder! 💎✨ Search for your dream diamond with us.';
    
    const introduction = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'text',
        text: {
            body: msg
        }
    };

    const welcomeService = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: {
                type: 'text',
                text: '⚙ Services'
            },
            body: {
                text: 'What kind of service you looking for?'
            },
            action: {
                button: 'Services',
                sections: [
                    {
                        title: 'Services',
                        rows: [
                            {
                                id: 'labgrown',
                                title: 'Lab Grown Diamond',
                                description: 'Service for lab grown diamond.'
                            },
                            {
                                id: 'avd',
                                title: 'AVD Diamond',
                                description: 'Service for avd diamond.'
                            },
                            {
                                id: 'hpht',
                                title: 'HPHT Diamond',
                                description: 'Service for hpht diamond.'
                            },
                            {
                                id: 'customer-service',
                                title: 'Consult Our Experts',
                                description: 'Consult our experts for more information.'
                            }
                        ]
                    }
                ]
            }
        }
    };
    await send(introduction);
    await send(welcomeService);
    setCurrentState(sender, 'welcome');
}

const send = async (data) => {
    await axios.post(url, data, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
}