const fetch = require('node-fetch');
const { PANEL_DOMAIN, PANEL_API_KEY } = require('../config');

module.exports = function listUsersCommand(bot, AUTHORIZED_ADMINS) {
    bot.onText(/\/listusers/, async (msg) => {
        const chatId = msg.chat.id;

        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to use this command.');
        }

        try {
            const res = await fetch(PANEL_DOMAIN + '/api/application/users', {
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

            const users = data.data; // array of users
            if (!users || users.length === 0) {
                return bot.sendMessage(chatId, 'No users found.');
            }

            // Format list
            let message = '📋 *List of Users:*\n\n';
            users.forEach((user) => {
                message += `👤 ${user.attributes.username} | ID: ${user.attributes.id} | Email: ${user.attributes.email}\n`;
            });

            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (err) {
            bot.sendMessage(chatId, '❌ Error: ' + err.message);
        }
    });
};