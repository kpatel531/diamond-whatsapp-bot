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

app.listen(port, () => {
    console.log("Sltrld whatsapp bot listening for port no:.", port);
});

// Webhook to receive messages
app.post('/webhook', async (req, res) => {
    const data = req.body;

    if (data.object) {
        if (data.entry && data.entry[0].changes && data.entry[0].changes[0].value.messages) {
            const message = data.entry[0].changes[0].value.messages[0];
            const from = message.from;
            const msgBody = message.text.body;

            await sendMessage(from, `You sent: ${msgBody}`);
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Function to send messages via WhatsApp API
async function sendMessage(to, text) {
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const data = {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: text }
    };
    await axios.post(url, data, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
}