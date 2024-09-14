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
const expertsNumber = process.env.CONSULT_NUMBER;
const consultToken = process.env.CONSULT_ACCESS_TOKEN;

const currentState = [];
const chatFilterData = [];

const setCurrentState = (chatId, action) => {
    currentState[chatId] = action;
}

const getCurrentState = (chatId) => {
    return currentState[chatId] || false;
}

const setFilterData = (chatId, data) => {
    if (!chatFilterData[chatId]) {
        chatFilterData[chatId] = [];
    }
    chatFilterData[chatId].push(data);
}

const getFilterData = (chatId) => {
    return chatFilterData[chatId] || [];
}

app.listen(port, () => {
    console.log(`Sltrld whatsapp bot running on:. http://localhost:${port}`);
});

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
    if(!getCurrentState(sender)) {
        setCurrentState(sender, 'inital');
    }

    switch(getCurrentState(sender)) {
        case 'services':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'button_reply') {
                    if (message.interactive.button_reply.id == 'customer-service') {
                        await consultMessage(sender);
                    } else {
                        setFilterData(sender, {"service": message.interactive.button_reply.title.toUpperCase()});
                        await shapeRequest(sender);
                    }
                } else {
                    await errorMsg(sender);
                }
            } else {
                await errorMsg(sender);
            }
        break;
        case 'shapes':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'list_reply') {
                    setFilterData(sender, {"shape": message.interactive.list_reply.title.toUpperCase()});
                    await caratRequest(sender);
                } else {
                    await errorMsg(sender);
                }
            } else {
                await errorMsg(sender);
            }
        break;
        case 'carats':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'list_reply') {
                    let carats = message.interactive.list_reply.id.split("_");
                    setFilterData(sender, {"carat": {"from": carats[0], "to": carats[1]}});
                    await colorRequest(sender);
                } else {
                    await errorMsg(sender);
                }
            } else {
                await errorMsg(sender);
            }
        break;
        case 'colors':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'list_reply') {
                    setFilterData(sender, {"color": message.interactive.list_reply.title.toUpperCase()});
                    await clarityRequest(sender);
                } else {
                    await errorMsg(sender);
                }
            } else {
                await errorMsg(sender);
            }
        break;
        case 'clarity':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'list_reply') {
                    setFilterData(sender, {"clarity": message.interactive.list_reply.title.toUpperCase()});
                    await certificateRequest(sender);
                } else {
                    await errorMsg(sender);
                }
            } else {
                await errorMsg(sender);
            }
        break;
        case 'certificate':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'button_reply') {
                    setFilterData(sender, {"certificate": message.interactive.button_reply.title});
                    await filterData(sender);
                } else {
                    await errorMsg(sender);
                }
            } else {
                await errorMsg(sender);
            }
        break;
        default:
            await welcomeMsg(sender);
        break;
    }
}

const certificateRequest = async (sender) => {
    const certificate = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'interactive',
        interactive: {
            type: 'button',
            header: {
                type: 'text',
                text: '💎 Certificate'
            },
            body: {
                text: 'Please select one of the following certificate:'
            },
            action: {
                buttons: [
                    {
                        type: 'reply',
                        reply: {
                            id: 'gia',
                            title: 'GIA'
                        }
                    },
                    {
                        type: 'reply',
                        reply: {
                            id: 'igi',
                            title: 'IGI'
                        }
                    }
                ]
            }
        }
    };

    await send(certificate);
    setCurrentState(sender, 'certificate');
}

const filterData = async (sender) => {
    let allDiamondList = require('./test_data.json');
    let filterlist = getFilterData(sender);
    allDiamondList = allDiamondList.data;
    const filteredDiamonds = allDiamondList.filter(diamond => 
        (diamond["Growth Type"] === filterlist[0].service) 
        && (diamond["Shape"] === filterlist[1].shape) 
        && (diamond["Weight"] >= filterlist[2].carat.from) 
        && (diamond["Weight"] <= filterlist[2].carat.to) 
        && (diamond["Color"] === filterlist[3].color) 
        && (diamond["Clarity"] === filterlist[4].clarity) 
        && (diamond["Lab"] === filterlist[5].certificate)
    );      
    
    if(filteredDiamonds.length) {
        const filter = {
            messaging_product: 'whatsapp',
            to: sender,
            type: 'text',
            text: {
                body: "Data is processing please wait"
            }
        };
    
        await send(filter);
    } else {
        const nofilter = {
            messaging_product: 'whatsapp',
            to: sender,
            type: 'text',
            text: {
                body: "Apologies, but the diamond shape you requested is not available at the moment. Could you please provide more details or clarify the specific shape you're looking for? This will help us better assist you in finding the right diamond that meets your preferences."
            }
        };
    
        await send(nofilter);
    }
    setCurrentState(sender, 'inital');
    chatFilterData[sender] = [];
}

const clarityRequest = async (sender) => {
    const clarity = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: {
                type: 'text',
                text: '💎 Clarity'
            },
            body: {
                text: 'What kind of clarity you looking for in diamonds?'
            },
            action: {
                button: 'Choose Clarity',
                sections: [
                    {
                        title: 'Clarity',
                        rows: [
                            {
                                id: 'if',
                                title: 'IF'
                            },
                            {
                                id: 'vvs1',
                                title: 'VVS1'
                            },
                            {
                                id: 'vvs2',
                                title: 'VVS2'
                            },
                            {
                                id: 'vs1',
                                title: 'VS1'
                            },
                            {
                                id: 'vs2',
                                title: 'VS2'
                            },
                            {
                                id: 'si1',
                                title: 'SI1'
                            }
                        ]
                    }
                ]
            }
        }
    };
    await send(clarity);
    setCurrentState(sender, 'clarity');
}

const caratRequest = async (sender) => {
    const carats = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: {
                type: 'text',
                text: '💎 Select a Carat Range'
            },
            body: {
                text: 'Please select one of the following carat ranges:'
            },
            action: {
                button: 'Choose Range',
                sections: [
                    {
                        title: 'Carat',
                        rows: [
                            {
                                id: '0_0.50',
                                title: '0 - 0.50'
                            },
                            {
                                id: '0.51_0.99',
                                title: '0.51 - 0.99'
                            },
                            {
                                id: '1_1.50',
                                title: '1 - 1.50'
                            },
                            {
                                id: '1.51_1.99',
                                title: '1.51 - 1.99'
                            }
                        ]
                    }
                ]
            }
        }
    };

    await send(carats);
    setCurrentState(sender, 'carats');
}

const colorRequest = async (sender) => {
    const colors = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: {
                type: 'text',
                text: '💎 Colors'
            },
            body: {
                text: 'What kind of color you looking for in diamonds?'
            },
            action: {
                button: 'Choose Color',
                sections: [
                    {
                        title: 'Color',
                        rows: [
                            {
                                id: 'd',
                                title: 'D'
                            },
                            {
                                id: 'e',
                                title: 'E'
                            },
                            {
                                id: 'f',
                                title: 'F'
                            },
                            {
                                id: 'g',
                                title: 'G'
                            },
                            {
                                id: 'h',
                                title: 'H'
                            },
                            {
                                id: 'i',
                                title: 'I'
                            }
                        ]
                    }
                ]
            }
        }
    };
    await send(colors);
    setCurrentState(sender, 'colors');
}

const shapeRequest = async (sender) => {
    const shapes = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: {
                type: 'text',
                text: '💎 Shapes'
            },
            body: {
                text: 'What kind of shape you looking for in diamonds?'
            },
            action: {
                button: 'Choose Shape',
                sections: [
                    {
                        title: 'Shape',
                        rows: [
                            {
                                id: 'round',
                                title: 'Round'
                            },
                            {
                                id: 'princess',
                                title: 'Princess'
                            },
                            {
                                id: 'cushion',
                                title: 'Cushion'
                            },
                            {
                                id: 'oval',
                                title: 'Oval'
                            },
                            {
                                id: 'emerald',
                                title: 'Emerald'
                            },
                            {
                                id: 'pear',
                                title: 'Pear'
                            },
                            {
                                id: 'radiant',
                                title: 'Radiant'
                            },
                            {
                                id: 'asscher',
                                title: 'Asscher'
                            },
                            {
                                id: 'marquise',
                                title: 'Marquise'
                            },
                            {
                                id: 'heart',
                                title: 'Heart'
                            }
                        ]
                    }
                ]
            }
        }
    };
    await send(shapes);
    setCurrentState(sender, 'shapes');
}

const consultMessage = async (sender) => {
    const consultantAlert = 'Solitaire Lab Diamond Searching Bot Alert:\n' +
    '\n'+
    `The number ${sender} requires your consultation regarding a diamond inquiry.`;

    const consult = {
        messaging_product: 'whatsapp',
        to: expertsNumber,
        type: 'text',
        text: {
            body: consultantAlert
        }
    };
    await sendConsult(consult);

    const senderMsg = "Our Solitaire Lab Diamond expert will contact you shortly to assist with your diamond search queries. Thank you for your interest!";
    const senderData = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'text',
        text: {
            body: senderMsg
        }
    };
    await send(senderData);
    setCurrentState(sender, 'inital');
}

const errorMsg = async (sender) => {
    const error = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'text',
        text: {
            body: "Apologies Boss! Could you please provide the correct information to help me improve my services? Your input is highly appreciated."
        }
    };
    await send(error);
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
            type: 'button',
            header: {
                type: 'text',
                text: '🛠️ Services'
            },
            body: {
                text: 'What kind of service you looking for?'
            },
            action: {
                buttons: [
                    {
                        type: 'reply',
                        reply: {
                            id: 'cvd',
                            title: 'CVD'
                        }
                    },
                    {
                        type: 'reply',
                        reply: {
                            id: 'hpht',
                            title: 'HPHT'
                        }
                    },
                    {
                        type: 'reply',
                        reply: {
                            id: 'customer-service',
                            title: 'Consult Our Experts'
                        }
                    }
                ]
            }
        }
    };
    await send(introduction);
    await send(welcomeService);
    setCurrentState(sender, 'services');
}

const send = async (data) => {
    await axios.post(url, data, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
}

const sendConsult = async (data) => {
    await axios.post(url, data, {
        headers: { 'Authorization': `Bearer ${consultToken}` }
    });
}