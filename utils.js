const axios = require('axios');
const {constants} = require('./constant');

const send = async (body, token) => {
    await axios.post(constants.url, body, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
}

module.exports = {
    send
}