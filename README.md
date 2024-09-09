# Solitaire Lab Diamond WhatsApp Chatbot

This repository contains the code and documentation for the Solitaire Lab Diamond WhatsApp Chatbot. The chatbot is designed to handle diamond inquiries efficiently using WhatsApp, leveraging the Graph API and Node.js.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Usage](#usage)
- [License](#license)

## Overview

The Solitaire Lab Diamond WhatsApp Chatbot is a Node.js application that interacts with users over WhatsApp to assist them with diamond inquiries. The chatbot can handle customer queries about diamond specifications, pricing, availability, and more.

## Features

- **Automated Responses:** Quickly respond to common diamond-related inquiries.
- **Search Diamonds:** Customers can search for diamonds by specifications.
- **Pricing and Availability:** Provide real-time information on diamond pricing and availability.
- **Seamless Integration:** Integrates with Solitaire Lab's backend to fetch and display diamond information.
- **User-Friendly Interface:** Simple and intuitive chat interface for customers.

## Getting Started

### Prerequisites

Before you start, ensure you have the following installed:

- Node.js (v16.x or later)
- npm (v6.x or later)
- A Meta developer account with access to the WhatsApp Business API
- A valid SSL certificate for secure API communication

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/yourusername/solitaire-lab-diamond-chatbot.git
   cd solitaire-lab-diamond-chatbot
2. **Install Dependencies:**
    ```bash
   npm install
### Configuration
1. **Create a .env file** in the root directory with the following content:
    ```bash
    PORT=3000
    WHATSAPP_PHONE_NUMBER_ID=your-whatsapp-phone-number-id
    WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
    BACKEND_API_URL=https://api.solitairelabdiamond.com
2. **Set Up Webhooks:** Configure the webhook URL in your Meta developer portal to point to your server (e.g., https://yourdomain.com/webhook).

### Usage
To start the server, run:

    npm start

The chatbot will be live and ready to handle inquiries.

### License
This project is licensed under the ASC License - see the LICENSE file for details.