const msg = 'Hello Boss! I am Diamond Searching Bot Working for "Solitaire Lab"\n' +
    '\n'+
    'Welcome to Diamond Finder! 💎✨ Search for your dream diamond with us.';

exports.introduction = (sender) => ({
    messaging_product: 'whatsapp',
    to: sender,
    type: 'text',
    text: {
        body: msg
    }
});

exports.consultExpert = (sender) => ({
    messaging_product: 'whatsapp',
    to: sender,
    type: 'interactive',
    interactive: {
        type: 'button',
        header: {
            type: 'text',
            text: '💼 Need Professional Consultation?'
        },
        body: {
            text: null
        },
        action: {
            buttons: [
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
});

exports.welcomeService = (sender, servicelist) => ({
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
            buttons: servicelist
        }
    }
});