const baseUrl = `https://graph.facebook.com/${process.env.VERSION}/${process.env.RECIPIENT_WAID}`;

exports.constants = {
    token : process.env.ACCESS_TOKEN,
    url : `${baseUrl}/messages`,
    mediaUrl : `${baseUrl}/media`,
    expertsNumber : process.env.CONSULT_NUMBER,
    consultToken : process.env.CONSULT_ACCESS_TOKEN,
}