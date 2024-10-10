require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
var FormData = require('form-data');
const fs = require('fs');
const {constants} = require('./constant');
const templates = require('./templates');
const utils = require('./utils');
const app = express();
app.use(bodyParser.json())

const PORT = +process.env.PORT || 3000;
const apiUrl = process.env.API_URL;
const optionlimit = 10

const currentState = [];
const chatFilterData = [];
let allDiamondList = [];
let servicelist = [];
let shapelist = [];
let weightlist = [];
let colorlist = [];
let claritylist = [];
let lablist = [];

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

const server = app.listen(PORT, async () => {
    console.log(`Sltrld chat bot running on:. http://localhost:${PORT}`);
    await retriveStockList();
});

// Graceful shutdown on SIGINT (Ctrl + C)
process.on('SIGINT', () => {
    console.log('SIGINT signal received. Closing server.');
    server.close(() => {
      console.log('Server closed. Exiting process.');
      process.exit(0);
    });
});

// Graceful shutdown on SIGTERM (kill command)
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing server.');
    server.close(() => {
        console.log('Server closed. Exiting process.');
        process.exit(0);
    });
});

const retriveStockList = async () => {
    try {
        await axios.get(apiUrl).then(response => {
            allDiamondList = response.data.data;

            let services = [...new Set(allDiamondList.map(list => list['Growth Type']))];
            services = services.filter(item => item && item !== '');
            services.forEach(list => {
                servicelist.push({
                    type: 'reply',
                    reply: {
                        id: list.replace(/\s/g, '-').toLowerCase(),
                        title: list
                    }
                })
            });
            servicelist.push({
                type: 'reply',
                reply: {
                    id: 'both',
                    title: "CVD & HPHT"
                }
            })

            let shapes = [...new Set(allDiamondList.map(list => list['Shape']))];
            shapes.filter(item => item && item !== '');
            shapes.forEach(list => {
                shapelist.push({
                    id: list.replace(/\s/g, '-').toLowerCase(),
                    title: list
                })
            });

            let sortedDiamonds = allDiamondList.sort((a, b) => a.Weight - b.Weight);
            let weights = [...new Set(sortedDiamonds.map(list => mapWeightToRange(list['Weight'])))];
            weights.filter(item => item && item !== '');
            weights.forEach(list => {
                weightlist.push({
                    id: list.replace(/\s/g, '_').toLowerCase(),
                    title: list
                })
            });

            let colors = [...new Set(allDiamondList.map(list => list['Color']))];
            colors.filter(item => item && item !== '');
            colors.forEach(list => {
                colorlist.push({
                    id: list.replace(/\s/g, '-').toLowerCase(),
                    title: list
                })
            });

            let clarities = [...new Set(allDiamondList.map(list => list['Clarity']))];
            clarities.filter(item => item && item !== '');
            clarities.forEach(list => {
                claritylist.push({
                    id: list.replace(/\s/g, '-').toLowerCase(),
                    title: list
                })
            });

            let labs = [...new Set(allDiamondList.map(list => list['Lab']))];
            labs.filter(item => item && item !== '');
            labs.forEach(list => {
                lablist.push({
                    type: 'reply',
                    reply: {
                        id: list.replace(/\s/g, '-').toLowerCase(),
                        title: list
                    }
                })
            });

            console.log(`shapelist:-  ${shapelist.length}`);
            if (shapelist.length > optionlimit) {
                const splitLists = splitList(shapelist);
                console.log(splitLists);
            }
        })
        .catch(error => {
            console.log('Error:', error);
        });
    } catch (error) {
        console.error(`Failed to send message: ${error}`);
        console.error(error);
    }
}

const splitList = (arr, chunkSize = (optionlimit - 1)) => {
    return arr.reduce((acc, _, i) => {
        if (i % chunkSize === 0) {
        acc.push(arr.slice(i, i + chunkSize));
        }
        return acc;
    }, []);
}

const mapWeightToRange = (weight) => {
    const step = 0.5;
    const lowerBound = Math.floor(weight / step) * step;
    const upperBound = lowerBound + step;
    return `${lowerBound.toFixed(1)} - ${upperBound.toFixed(1)}`;
};

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
            try {
                await sendMessage(sender, message);
            } catch (error) {
                console.error(`Failed to send message: ${error}`);
                console.error(error);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Function to send messages via WhatsApp API
const sendMessage = async (sender, message) => {
    switch(getCurrentState(sender)) {
        case 'services':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'button_reply') {
                    if (message.interactive.button_reply.id == 'both') {
                        setFilterData(sender, {"service": ['CVD','HPHT']});
                    } else {
                        setFilterData(sender, {"service": [message.interactive.button_reply.title]});
                    }
                    await shapeRequest(sender, 0);
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
                    let id = message.interactive.list_reply.id;
                    if (id === 'show_more') {
                        await shapeRequest(sender, 1);
                    } else {
                        setFilterData(sender, {"shape": message.interactive.list_reply.title});
                        await caratRequest(sender);
                    }
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
                    let carats = message.interactive.list_reply.id.split(" - ");
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
                    setFilterData(sender, {"color": message.interactive.list_reply.title});
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
                    setFilterData(sender, {"clarity": message.interactive.list_reply.title});
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
    console.log(lablist);
    const certificate = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'interactive',
        interactive: {
            type: 'button',
            header: {
                type: 'text',
                text: '🛡️ Certificate'
            },
            body: {
                text: 'Please select one of the following certificate:'
            },
            action: {
                buttons: lablist
            }
        }
    };

    await utils.send(certificate, constants.token);
    setCurrentState(sender, 'certificate');
}

const uploadFile = async (sender, data) => {
    const headers = Object.keys(data[0]);
    const excelData = [
        headers,
        ...data.map(row => headers.map(header => row[header]))
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    XLSX.utils.book_append_sheet(wb, ws, "Diamond Prices");
    XLSX.writeFile(wb, `data/DiamondStocks-${sender}.xlsx`);


    const form = new FormData();
    form.append('file', fs.createReadStream(`./data/DiamondStocks-${sender}.xlsx`));
    form.append('messaging_product', 'whatsapp');

    try {
        const response = await axios.post(
            constants.mediaUrl,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    Authorization: `Bearer ${constants.token}`,
                },
            }
        );
        return response.data.id;
    } catch (error) {
        console.error('Error uploading document:', error);
    }
}

const sendStockFile = async (sender, data) => {
    try {
        const mediaId = await uploadFile(sender, data);
        const response = await axios.post(
            constants.url,
            {
                messaging_product: 'whatsapp',
                to: sender,
                type: 'document',
                document: {
                    id: mediaId,
                    caption: 'Here is the Diamond stock document you requested!',
                    filename: 'DiamondStocks.xlsx',
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${constants.token}`,
                },
            }
        );
        console.log('Document sent:', response.data);
        fs.unlink(`./data/DiamondStocks-${sender}.xlsx`, (err) => {
            if (err) {
                console.error('Error unlink the file:', err);
            } else {
                console.log('File unlink successfully');
            }
        });
    } catch (error) {
        console.error('Error sending document:', error);
    }
}

const filterData = async (sender) => {
    let filterlist = getFilterData(sender);
    console.log(allDiamondList);
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
        await sendStockFile(sender, filteredDiamonds);

        const thankyouMsg = 'Thank you so much for your interest! We truly appreciate your enthusiasm. Please stay tuned as we will be showcasing more exciting and exclusive items soon. We look forward to sharing more stunning diamonds and unique collections with you!Thank you so much for your interest! We truly appreciate your enthusiasm. Please stay tuned as we will be showcasing more exciting and exclusive items soon. We look forward to sharing more stunning diamonds and unique collections with you!😊🙏'

        const thankyou = {
            messaging_product: 'whatsapp',
            to: sender,
            type: 'text',
            text: {
                body: thankyouMsg
            }
        };
    
        await utils.send(thankyou, constants.token);
    } else {
        const nofilter = {
            messaging_product: 'whatsapp',
            to: sender,
            type: 'text',
            text: {
                body: "Apologies, but the diamond shape you requested is not available at the moment. Could you please provide more details or clarify the specific shape you're looking for? This will help us better assist you in finding the right diamond that meets your preferences."
            }
        };
    
        await utils.send(nofilter, constants.token);
    }
    setCurrentState(sender, '');
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
                        rows: claritylist
                    }
                ]
            }
        }
    };
    await utils.send(clarity, constants.token);
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
                        rows: weightlist
                    }
                ]
            }
        }
    };

    await utils.send(carats, constants.token);
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
                        rows: colorlist
                    }
                ]
            }
        }
    };
    await utils.send(colors, constants.token);
    setCurrentState(sender, 'colors');
}

const shapeRequest = async (sender, index) => {
    let shapeOption = shapelist[index];
    if (index != 1) {
        shapeOption.push({
            id: 'show_more',
            title: 'Show More Options'
        });
    }
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
                        rows: shapeOption
                    }
                ]
            }
        }
    };
    await utils.send(shapes, constants.token);
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
    await utils.send(consult, constants.consultToken);

    const senderMsg = "Our Solitaire Lab Diamond expert will contact you shortly to assist with your diamond search queries. Thank you for your interest!";
    const senderData = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'text',
        text: {
            body: senderMsg
        }
    };
    await utils.send(senderData, constants.token);
    setCurrentState(sender, '');
}

const isRepeatMore = async (sender, label, state) => {
    const error = {
        messaging_product: 'whatsapp',
        to: sender,
        type: 'interactive',
        interactive: {
            type: 'button',
            header: {
                type: 'text',
                text: `👋 Choose More ${label}`
            },
            body: {
                text: null
            },
            action: {
                buttons: [
                    {
                        type: 'reply',
                        reply: {
                            id: 1,
                            title: '✅ Yes,Processed'
                        }
                    },
                    {
                        type: 'reply',
                        reply: {
                            id: 0,
                            title: '🛑 No, Continue With Next Step'
                        }
                    }
                ]
            }
        }
    };
    await utils.send(error, constants.token);
    setCurrentState(sender, state);
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
    await utils.send(error, constants.token);
}

const welcomeMsg = async (sender) => {
    await utils.send(templates.introduction(sender), constants.token);
    await utils.send(templates.welcomeService(sender, servicelist), constants.token);
    setCurrentState(sender, 'services');
}