const fetch = require('node-fetch');
const { PANEL_DOMAIN, PANEL_API_KEY } = require('../config');

module.exports = function listServersCommand(bot, AUTHORIZED_ADMINS) {
    bot.onText(/\/listservers/, async (msg) => {
        const chatId = msg.chat.id;

        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to use this command.');
        }

        try {
            // Fetch all servers
            const res = await fetch(PANEL_DOMAIN + '/api/application/servers', {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + PANEL_API_KEY
                }
            });

            const data = await res.json();

            if (data.errors) {
                return bot.sendMessage(chatId, '❌ ' + JSON.stringify(data.errors[0]));
            }

            const servers = data.data; // array of servers
            if (!servers || servers.length === 0) {
                return bot.sendMessage(chatId, 'No servers found.');
            }

            // Format server list
            let message = '📋 *List of Servers:*\n\n';
            servers.forEach((server) => {
                const attr = server.attributes;
                message += `🖥️ Name: ${attr.name}\n👤 User ID: ${attr.user}\n💻 Status: ${attr.status}\nRAM: ${attr.limits.memory === 0 ? 'Unlimited' : attr.limits.memory + ' MB'} | CPU: ${attr.limits.cpu === 0 ? 'Unlimited' : attr.limits.cpu + '%'} | Disk: ${attr.limits.disk === 0 ? 'Unlimited' : attr.limits.disk + ' MB'}\n\n`;
            });

            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (err) {
            bot.sendMessage(chatId, '❌ Error: ' + err.message);
        }
    });
};