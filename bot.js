const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const path = require('path');
const fs = require('fs');

// Load database if exists
const DATABASE_FILE = path.join(__dirname, 'commands/database.json');
if (!fs.existsSync(DATABASE_FILE)) {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify({
        users: [],
        servers: [],
        creations: []
    }, null, 2));
}

// Initialize bot
const bot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });

console.log('🤖 XCASPER Hosting Bot is starting...');
console.log(`📊 Panel URL: ${config.PANEL_DOMAIN}`);
console.log(`👑 Authorized Admins: ${config.AUTHORIZED_ADMINS.join(', ')}`);

// Import and initialize commands
const commands = {};

// Dynamically load all command files from commands folder
const commandsDir = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

commandFiles.forEach(file => {
    try {
        const commandName = file.replace('.js', '');
        const commandPath = path.join(commandsDir, file);
        const commandModule = require(commandPath);
        
        if (typeof commandModule === 'function') {
            commands[commandName] = commandModule;
            console.log(`✅ Loaded command: ${commandName}`);
        }
    } catch (err) {
        console.error(`❌ Error loading command ${file}:`, err.message);
    }
});

// Initialize commands with bot
Object.entries(commands).forEach(([name, command]) => {
    if (typeof command === 'function') {
        try {
            // For createServer command, pass AUTHORIZED_ADMINS
            if (name === 'createserver') {
                command(bot, config.AUTHORIZED_ADMINS);
            } else {
                command(bot);
            }
        } catch (err) {
            console.error(`❌ Error initializing command ${name}:`, err.message);
        }
    }
});

// Load and initialize AutoCleanup service if exists
let autoCleanup = null;
try {
    const AutoCleanup = require('./services/autocleanup');
    autoCleanup = new AutoCleanup(bot, config.AUTHORIZED_ADMINS);
    autoCleanup.startScheduledCleanup();
    console.log('✅ AutoCleanup service started');
} catch (err) {
    console.log('⚠️ AutoCleanup service not loaded:', err.message);
}

// Bot event handlers
bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error);
});

bot.on('webhook_error', (error) => {
    console.error('❌ Webhook error:', error);
});

// Help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🤖 *XCASPER HOSTING BOT - HELP GUIDE*

*SERVER CREATION COMMANDS:*
• /unli - Create unlimited server
• /1gb - Create 1GB server
• /2gb - Create 2GB server
• /3gb - Create 3GB server
• /4gb - Create 4GB server
• /5gb - Create 5GB server
• /cancel - Cancel current creation process

*USER MANAGEMENT:*
• /createuser - Create new user
• /listusers - List all users
• /deluser - Delete a user

*SERVER MANAGEMENT:*
• /addserver - Add server to existing user
• /listservers - List all servers
• /delserver - Delete a server

*ADMIN PANEL:*
• /cpanel - Admin panel access
• /listadmins - List panel admins
• /addadmin - Add admin to panel

*STATUS & INFO:*
• /status - Full system status
• /ping - Quick connection test
• /mini_status - Quick status
• /stats - Creation statistics
• /list - List recent creations
• /menu - Show main menu

*UTILITIES:*
• /cleanup_status - Check cleanup status
• /manual_cleanup - Run manual cleanup (Admin only)

*SUPPORT:*
Owner: @casper_tech_ke
Website: api.xcasper.site
Panel: ${config.PANEL_DOMAIN}

*Motto:* We believe in growing and building together!
`;

    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const startMessage = `
🚀 *Welcome to XCASPER HOSTING BOT!*

I am your automated hosting assistant. I can help you:
• Create servers (1GB to UNLI)
• Manage users and servers
• Monitor system status
• And much more!

*Quick Start:*
Use /unli to create unlimited server
Use /2gb for 2GB server
Use /status for system status

*Need Help?*
Use /help for full command list
Use /menu for interactive menu

*Contact Support:*
👑 @casper_tech_ke
🌐 api.xcasper.site

*We believe in growing and building together!*
    `;

    bot.sendMessage(chatId, startMessage, { parse_mode: 'Markdown' });
});

// Info command
bot.onText(/\/info/, (msg) => {
    const chatId = msg.chat.id;
    const infoMessage = `
🏢 *XCASPER HOSTING - COMPANY INFO*

*About Us:*
XCASPER Hosting is a premium hosting service powered by CASPER TECH. We provide reliable and scalable hosting solutions with 24/7 support.

*Our Services:*
• Game Server Hosting
• VPS & Dedicated Servers
• Web Hosting
• Discord Bot Hosting
• Custom Solutions

*Contact Information:*
• Owner: @casper_tech_ke
• Website: api.xcasper.site
• Panel: ${config.PANEL_DOMAIN}
• Support: 24/7 via Telegram

*Our Panel Features:*
• Pterodactyl Control Panel
• Instant Server Deployment
• Real-time Monitoring
• Automated Backups
• Unlimited Scalability

*Motto:*
"We believe in growing and building together!"

*Statistics:*
• Uptime: 99.9%
• Support Response: < 5 minutes
• Server Locations: Worldwide

Thank you for choosing XCASPER HOSTING!
    `;

    bot.sendMessage(chatId, infoMessage, { parse_mode: 'Markdown' });
});

// Manual cleanup command
bot.onText(/\/manual_cleanup/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (!config.AUTHORIZED_ADMINS.includes(chatId)) {
        return bot.sendMessage(chatId, '❌ You are not authorized to run manual cleanup.');
    }

    if (!autoCleanup) {
        return bot.sendMessage(chatId, '❌ AutoCleanup service is not available.');
    }

    await autoCleanup.manualCleanup(chatId);
});

// Cleanup status command
bot.onText(/\/cleanup_status/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (!config.AUTHORIZED_ADMINS.includes(chatId)) {
        return bot.sendMessage(chatId, '❌ You are not authorized to view cleanup status.');
    }

    if (!autoCleanup) {
        return bot.sendMessage(chatId, '❌ AutoCleanup service is not available.');
    }

    const status = autoCleanup.getStatus();
    
    const statusMessage = `
🧹 *AUTO CLEANUP STATUS*

*Service Status:* ${status.isRunning ? '🔄 Running' : '✅ Idle'}
*Total Servers:* ${status.totalServers}
*Old Servers (>${status.daysThreshold} days):* ${status.oldServers}
*Next Check:* ${status.nextCheck}
*Threshold:* Delete servers older than ${status.daysThreshold} days

*Auto Cleanup Schedule:*
• Runs every 24 hours
• Deletes servers older than ${status.daysThreshold} days
• Sends notifications to admin
• Updates database automatically

*To run manually:* /manual_cleanup
    `;

    bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
});

// Menu command (interactive menu)
bot.onText(/\/menu/, (msg) => {
    const chatId = msg.chat.id;
    
    const menuOptions = {
        reply_markup: {
            keyboard: [
                [{ text: '🚀 Create Server' }, { text: '👤 Manage Users' }],
                [{ text: '📊 View Status' }, { text: '📈 Statistics' }],
                [{ text: '🛠️ Admin Tools' }, { text: '❓ Help' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        },
        parse_mode: 'Markdown'
    };

    const menuMessage = `
📱 *XCASPER HOSTING - INTERACTIVE MENU*

Choose an option below or use commands:

*Quick Actions:*
🚀 Create Server - /unli, /2gb, etc
👤 Manage Users - /createuser, /listusers
📊 View Status - /status, /ping
📈 Statistics - /stats, /list
🛠️ Admin Tools - /cpanel, /cleanup_status
❓ Help - /help, /info

*Contact Support:* @casper_tech_ke
*Website:* api.xcasper.site
    `;

    bot.sendMessage(chatId, menuMessage, menuOptions);
});

// Handle menu button clicks
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    switch(text) {
        case '🚀 Create Server':
            bot.sendMessage(chatId, 'Choose server type:\n\n/unli - Unlimited\n/2gb - 2GB Server\n/3gb - 3GB Server\n/5gb - 5GB Server\n\nOr use any size: /1gb, /4gb, etc.');
            break;
        case '👤 Manage Users':
            bot.sendMessage(chatId, 'User Management:\n\n/createuser - Create new user\n/listusers - List all users\n/deluser - Delete user');
            break;
        case '📊 View Status':
            bot.sendMessage(chatId, 'Fetching system status...');
            bot.emit('text', { ...msg, text: '/status' });
            break;
        case '📈 Statistics':
            bot.sendMessage(chatId, 'Fetching statistics...');
            bot.emit('text', { ...msg, text: '/stats' });
            break;
        case '🛠️ Admin Tools':
            if (config.AUTHORIZED_ADMINS.includes(chatId)) {
                bot.sendMessage(chatId, 'Admin Tools:\n\n/cpanel - Admin Panel\n/cleanup_status - Cleanup Status\n/manual_cleanup - Run Cleanup\n/listadmins - List Admins');
            } else {
                bot.sendMessage(chatId, '❌ Admin access required.');
            }
            break;
        case '❓ Help':
            bot.sendMessage(chatId, 'Opening help guide...');
            bot.emit('text', { ...msg, text: '/help' });
            break;
    }
});

// Welcome message for authorized admins
bot.onText(/\/admin_welcome/, (msg) => {
    const chatId = msg.chat.id;
    
    if (config.AUTHORIZED_ADMINS.includes(chatId)) {
        const welcomeMessage = `
👑 *WELCOME ADMIN!*

You have full access to the XCASPER Hosting Bot.

*Admin Commands Available:*
• All creation commands (/unli, /2gb, etc)
• /cpanel - Admin panel access
• /cleanup_status - View cleanup status
• /manual_cleanup - Run manual cleanup
• /listadmins - List all admins
• /addadmin - Add new admin

*Bot Information:*
• Panel: ${config.PANEL_DOMAIN}
• Global Egg ID: ${config.GLOBAL_EGG}
• Global Location: ${config.GLOBAL_LOCATION}
• Authorized Admins: ${config.AUTHORIZED_ADMINS.length}

*Database:*
• Location: commands/database.json
• Auto-backup: Enabled
• Cleanup: Every 24 hours

Use /menu for interactive menu or /help for full command list.

*Happy hosting!*
        `;

        bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    }
});

// Bot ready message
console.log('✅ Bot initialized successfully!');
console.log('📱 Bot is now listening for commands...');
console.log('🔗 Bot username: ' + (bot.options.username || 'Not set'));
console.log('💾 Database file: ' + DATABASE_FILE);

// Export bot for testing if needed
module.exports = bot;