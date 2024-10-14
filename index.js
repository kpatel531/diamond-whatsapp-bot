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
const currentOptionPosition = [];
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

const getFilterData = (chatId) => {
    return chatFilterData[chatId] || [];
}

const setFilterData = (chatId, state, data) => {
    if (!chatFilterData[chatId]) {
        chatFilterData[chatId] = [];
    }
    if (!chatFilterData[chatId][state]) {
        chatFilterData[chatId][state] = [];
    }
    if (chatFilterData[chatId][state] && chatFilterData[chatId][state] != data) {
        let existData = chatFilterData[chatId][state];
        let prepareData = existData.concat([data]);
        chatFilterData[chatId][state] = prepareData;
    }
}

const getOptionLevel = (chatId, state) => {
    return currentOptionPosition[chatId][state] || [];
}

const setOptionLevel= (chatId, state, position) => {
    if (!currentOptionPosition[chatId]) {
        currentOptionPosition[chatId] = [];
    }
    currentOptionPosition[chatId][state] = position;
}

const server = app.listen(PORT, async () => {
    console.log(`Sltrld chat bot running on:. http://localhost:${PORT}`);
    let currentdate = new Date();
    let datetime = "Initial Sync: " + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
    console.log(datetime);
    await retriveStockList();
    currentdate = new Date();
    datetime = "Last Sync: " + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
    console.log(datetime);
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
            if (shapelist.length > optionlimit) {
                shapelist = splitList(shapelist);
            } else {
                shapelist = [shapelist];
            }

            let sortedDiamonds = allDiamondList.sort((a, b) => a.Weight - b.Weight);
            let weights = [...new Set(sortedDiamonds.map(list => mapWeightToRange(list['Weight'])))];
            weights.filter(item => item && item !== '');
            weights.forEach(list => {
                weightlist.push({
                    id: list.replace(/\s/g, '').toLowerCase(),
                    title: list
                })
            });
            if (weightlist.length > optionlimit) {
                weightlist = splitList(weightlist);
            } else {
                weightlist = [weightlist];
            }

            let colors = [...new Set(allDiamondList.map(list => list['Color']))];
            colors.filter(item => item && item !== '');
            colors.forEach(list => {
                colorlist.push({
                    id: list.replace(/\s/g, '-').toLowerCase(),
                    title: list
                })
            });
            if (colorlist.length > optionlimit) {
                colorlist = splitList(colorlist);
            } else {
                colorlist = [colorlist];
            }

            let clarities = [...new Set(allDiamondList.map(list => list['Clarity']))];
            clarities.filter(item => item && item !== '');
            clarities.forEach(list => {
                claritylist.push({
                    id: list.replace(/\s/g, '-').toLowerCase(),
                    title: list
                })
            });
            if (claritylist.length > optionlimit) {
                claritylist = splitList(claritylist);
            } else {
                claritylist = [claritylist];
            }

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
            lablist.push({
                type: 'reply',
                reply: {
                    id: 'both',
                    title: "IGI & GIA"
                }
            })
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
                        setFilterData(sender, 'service', 'CVD');
                        setFilterData(sender, 'service', 'HPHT');
                    } else {
                        setFilterData(sender, 'service', message.interactive.button_reply.title);
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
                        let pos = getOptionLevel(sender, 'shapes');
                        await shapeRequest(sender, pos);
                    } else {
                        setFilterData(sender, 'shape', message.interactive.list_reply.title);
                        await isRepeatMore(sender, 'Shape', 'shapes');
                    }
                }

                if(message.interactive.type == 'button_reply') {
                    if (message.interactive.button_reply.id == "yes") {
                        await shapeRequest(sender, 0);
                    } else {
                        await caratRequest(sender, 0);
                    }
                }
            } else {
                await errorMsg(sender);
            }
        break;
        case 'carats':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'list_reply') {
                    let id = message.interactive.list_reply.id;
                    if (id === 'show_more') {
                        let pos = getOptionLevel(sender, 'carats');
                        await caratRequest(sender, pos);
                    } else {
                        let carats = message.interactive.list_reply.id.split("-");
                        setFilterData(sender, 'carat', {"from": carats[0], "to": carats[1]});
                        await colorRequest(sender, 0);
                    }
                }
            } else {
                await errorMsg(sender);
            }
        break;
        case 'colors':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'list_reply') {
                    let id = message.interactive.list_reply.id;
                    if (id === 'show_more') {
                        let pos = getOptionLevel(sender, 'colors');
                        await colorRequest(sender, pos);
                    } else {
                        setFilterData(sender, 'color', message.interactive.list_reply.title);
                        await isRepeatMore(sender, 'Colors', 'colors');
                    }
                }

                if(message.interactive.type == 'button_reply') {
                    if (message.interactive.button_reply.id == "yes") {
                        await colorRequest(sender, 0);
                    } else {
                        await clarityRequest(sender, 0);
                    }
                }
            } else {
                await errorMsg(sender);
            }
        break;
        case 'clarity':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'list_reply') {
                    let id = message.interactive.list_reply.id;
                    if (id === 'show_more') {
                        let pos = getOptionLevel(sender, 'clarity');
                        await clarityRequest(sender, pos);
                    } else {
                        setFilterData(sender, 'clarity', message.interactive.list_reply.title);
                        await isRepeatMore(sender, 'Clarity', 'clarity');
                    }
                }

                if(message.interactive.type == 'button_reply') {
                    if (message.interactive.button_reply.id == "yes") {
                        await clarityRequest(sender, 0);
                    } else {
                        await certificateRequest(sender);
                    }
                }
            } else {
                await errorMsg(sender);
            }
        break;
        case 'certificate':
            if (message.type == 'interactive') {
                if(message.interactive.type == 'button_reply') {
                    if (message.interactive.button_reply.id == 'both') {
                        setFilterData(sender, 'certificate', 'IGI');
                        setFilterData(sender, 'certificate', 'GIA');
                    } else {
                        setFilterData(sender, 'certificate', message.interactive.button_reply.title);
                    }
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
    let filterList = getFilterData(sender);
    console.log(filterList);

    const filteredDiamonds = allDiamondList.filter(diamond => 
        (filterList['service'].includes(diamond["Growth Type"])) 
        && (filterList['shape'].includes(diamond["Shape"])) 
        && (diamond["Weight"] >= filterList['carat'][0].from) 
        && (diamond["Weight"] <= filterList['carat'][0].to) 
        && (filterList['color'].includes(diamond["Color"])) 
        && (filterList['clarity'].includes(diamond["Clarity"])) 
        && (filterList['certificate'].includes(diamond["Lab"]))
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

const clarityRequest = async (sender, index) => {
    let clarityOption;
    if (claritylist.length > 1) {
        clarityOption = claritylist[index];
        let newObject = {
            id: 'show_more',
            title: 'Load More Options'
        };
        let lastIndex = claritylist.length - 1;
        if (index != lastIndex) {
            if (!clarityOption.some(item => item.id === newObject.id)) {
                clarityOption.push(newObject);
            }
        }
        setOptionLevel(sender, 'clarity', (index + 1));
    } else {
        clarityOption = claritylist[0];
    }
    
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
                        rows: clarityOption
                    }
                ]
            }
        }
    };
    await utils.send(clarity, constants.token);
    setCurrentState(sender, 'clarity');
}

const caratRequest = async (sender, index) => {
    let caratOption;
    if (weightlist.length > 1) {
        caratOption = weightlist[index];
        let newObject = {
            id: 'show_more',
            title: 'Load More Options'
        };
        let lastIndex = weightlist.length - 1;
        if (index != lastIndex) {
            if (!caratOption.some(item => item.id === newObject.id)) {
                caratOption.push(newObject);
            }
        }
        setOptionLevel(sender, 'carats', (index + 1));
    } else {
        caratOption = weightlist[0];
    }
    
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
                        rows: caratOption
                    }
                ]
            }
        }
    };

    await utils.send(carats, constants.token);
    setCurrentState(sender, 'carats');
}

const colorRequest = async (sender, index) => {
    let colorOption;
    if (colorlist.length > 1) {
        colorOption = colorlist[index];
        let newObject = {
            id: 'show_more',
            title: 'Load More Options'
        };
        let lastIndex = colorlist.length - 1;
        if (index != lastIndex) {
            if (!colorOption.some(item => item.id === newObject.id)) {
                colorOption.push(newObject);
            }
        }
        setOptionLevel(sender, 'colors', (index + 1));
    } else {
        colorOption = colorlist[0];
    }
    
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
                        rows: colorOption
                    }
                ]
            }
        }
    };
    await utils.send(colors, constants.token);
    setCurrentState(sender, 'colors');
}

const shapeRequest = async (sender, index) => {
    let shapeOption;
    if (shapelist.length > 1) {
        shapeOption = shapelist[index];
        let newObject = {
            id: 'show_more',
            title: 'Load More Options'
        };
        let lastIndex = shapelist.length - 1;
        if (index != lastIndex) {
            if (!shapeOption.some(item => item.id === newObject.id)) {
                shapeOption.push(newObject);
            }
        }
        setOptionLevel(sender, 'shapes', (index + 1));
    } else {
        shapeOption = shapelist[0];
    }
    
    let shapes = {
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
    const isReapeat = {
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
                text: "Do you want to choose more or move for next step?"
            },
            action: {
                buttons: [
                    {
                        type: 'reply',
                        reply: {
                            id: "yes",
                            title: '✅ Yes'
                        }
                    },
                    {
                        type: 'reply',
                        reply: {
                            id: "no",
                            title: '🛑 No'
                        }
                    }
                ]
            }
        }
    };
    await utils.send(isReapeat, constants.token);
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