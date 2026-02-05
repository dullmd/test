const fetch = require('node-fetch');
const { PANEL_DOMAIN, PANEL_API_KEY } = require('../config');

module.exports = function listPanelAdminsCommand(bot, AUTHORIZED_ADMINS) {
    
    bot.onText(/\/listpaneladmins/, async (msg) => {
        const chatId = msg.chat.id;

        // Check if the Telegram user is authorized
        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, "❌ You are not authorized to view panel admins.");
        }

        try {
            // Fetch all panel users
            const res = await fetch(PANEL_DOMAIN + "/api/application/users", {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: "Bearer " + PANEL_API_KEY
                }
            });

            const data = await res.json();

            if (!data.data) {
                return bot.sendMessage(chatId, "❌ Failed to fetch users data.");
            }

            // Filter only admin users
            const admins = data.data.filter(u => u.attributes.root_admin === true);

            if (admins.length === 0) {
                return bot.sendMessage(chatId, "⚠ No panel admins found.");
            }

            // Build the admin list message
            let text = `👑 *Pterodactyl Panel Admins*\n\n`;

            admins.forEach((admin, index) => {
                const u = admin.attributes;
                text += `*${index + 1}.* ${u.username}\n`;
                text += `📧 Email: ${u.email}\n`;
                text += `🆔 ID: ${u.id}\n`;
                text += `───────────────\n`;
            });

            bot.sendMessage(chatId, text, { parse_mode: "Markdown" });

        } catch (err) {
            bot.sendMessage(chatId, "❌ Error fetching panel admins: " + err.message);
        }
    });
};