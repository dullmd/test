const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const path = require('path');
const fs = require('fs');

// Hakikisha config iko sahihi
console.log('🔧 Loading configuration...');
console.log('🤖 Bot Token:', config.TELEGRAM_TOKEN ? '✅ Set' : '❌ Missing');
console.log('🌐 Panel URL:', config.PANEL_DOMAIN);
console.log('👑 Admins:', config.AUTHORIZED_ADMINS ? config.AUTHORIZED_ADMINS.join(', ') : 'None');

// Initialize bot
const bot = new TelegramBot(config.TELEGRAM_TOKEN, { 
    polling: true,
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});

console.log('\n🤖 XCASPER Hosting Bot is starting...');
console.log('🚀 Version: 2.0.0');
console.log('📅 Started:', new Date().toLocaleString());

// Load database if exists
const DATABASE_FILE = path.join(__dirname, 'commands/database.json');
if (!fs.existsSync(DATABASE_FILE)) {
    console.log('📁 Creating new database file...');
    fs.writeFileSync(DATABASE_FILE, JSON.stringify({
        users: [],
        servers: [],
        creations: []
    }, null, 2));
}
console.log('💾 Database:', DATABASE_FILE);

// Import and initialize commands
const commands = {};

// Dynamically load all command files from commands folder
const commandsDir = path.join(__dirname, 'commands');
try {
    const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));

    console.log('\n📂 Loading commands:');
    commandFiles.forEach(file => {
        try {
            const commandName = file.replace('.js', '');
            const commandPath = path.join(commandsDir, file);
            
            // Skip if it's createserver (we'll load it specially)
            if (commandName === 'createserver') {
                console.log(`⏳ ${commandName} - Will load with config`);
                return;
            }
            
            const commandModule = require(commandPath);
            
            if (typeof commandModule === 'function') {
                commands[commandName] = commandModule;
                console.log(`✅ ${commandName}`);
                
                // Initialize the command
                commandModule(bot);
            }
        } catch (err) {
            console.error(`❌ ${file}:`, err.message);
        }
    });
} catch (err) {
    console.error('❌ Error reading commands directory:', err.message);
}

// Load createserver command separately with config
try {
    const createServerModule = require('./commands/createserver');
    if (typeof createServerModule === 'function') {
        console.log('✅ createserver (with config)');
        createServerModule(bot, config.AUTHORIZED_ADMINS);
    }
} catch (err) {
    console.error('❌ Error loading createserver:', err.message);
}

// Try to load autocleanup (but don't crash if missing)
let autoCleanup = null;
try {
    const AutoCleanup = require('./services/autocleanup');
    autoCleanup = new AutoCleanup(bot, config.AUTHORIZED_ADMINS);
    autoCleanup.startScheduledCleanup();
    console.log('✅ AutoCleanup service started');
} catch (err) {
    console.log('⚠️ AutoCleanup service not loaded:', err.message);
    console.log('ℹ️ You can create the services/autocleanup.js file later');
}

// Basic error handling
bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error.message);
});

bot.on('webhook_error', (error) => {
    console.error('❌ Webhook error:', error);
});

bot.on('error', (error) => {
    console.error('❌ Bot error:', error.message);
});

// ========== BASIC COMMANDS ==========

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = config.AUTHORIZED_ADMINS && config.AUTHORIZED_ADMINS.includes(chatId);
    
    const welcomeMsg = `
🚀 *Welcome to XCASPER HOSTING BOT!*

I am your automated hosting assistant.

*Quick Commands:*
• /help - Show all commands
• /status - System status
• /ping - Test connection

${isAdmin ? '👑 *You are an ADMIN* - Full access enabled!' : '🔒 Standard user access'}

*Support:*
👑 @casper_tech_ke
🌐 ${config.PANEL_DOMAIN}

*Motto:* We believe in growing and building together!
    `;
    
    bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
});

// Help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = config.AUTHORIZED_ADMINS && config.AUTHORIZED_ADMINS.includes(chatId);
    
    let helpMsg = `
🤖 *XCASPER HOSTING BOT - HELP*

*Available Commands:*
• /start - Welcome message
• /help - This help message
• /status - System status
• /ping - Quick ping test
• /menu - Interactive menu
`;
    
    if (isAdmin) {
        helpMsg += `
*ADMIN COMMANDS:*
• /unli - Create unlimited server
• /1gb, /2gb, /3gb, etc - Create server with specific RAM
• /stats - View statistics
• /list - List recent creations
• /cancel - Cancel creation process
`;
    }
    
    helpMsg += `
*Support:*
Owner: @casper_tech_ke
Panel: ${config.PANEL_DOMAIN}

Use /menu for interactive options.
`;
    
    bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
});

// Status command (simple version)
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    
    const statusMsg = `
📊 *XCASPER HOSTING STATUS*

*Bot Status:* ✅ Online
*Panel URL:* ${config.PANEL_DOMAIN}
*Bot Uptime:* ${Math.floor(process.uptime() / 60)} minutes
*Your ID:* ${msg.from.id}

*Commands Loaded:* ${Object.keys(commands).length}
*AutoCleanup:* ${autoCleanup ? '✅ Active' : '❌ Not available'}

*Quick Test:* /ping
*Full Help:* /help

*Contact:* @casper_tech_ke
`;
    
    bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
});

// Ping command
bot.onText(/\/ping/, async (msg) => {
    const chatId = msg.chat.id;
    const start = Date.now();
    
    const pingMsg = `
🏓 *PONG!*

*Response Time:* ${Date.now() - start}ms
*Bot Uptime:* ${Math.floor(process.uptime())} seconds
*Memory Usage:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB

✅ Bot is working perfectly!

*Panel:* ${config.PANEL_DOMAIN}
`;
    
    bot.sendMessage(chatId, pingMsg, { parse_mode: 'Markdown' });
});

// Menu command
bot.onText(/\/menu/, (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = config.AUTHORIZED_ADMINS && config.AUTHORIZED_ADMINS.includes(chatId);
    
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: '📊 Status' }, { text: '❓ Help' }],
                [{ text: '🏓 Ping Test' }]
            ]
        }
    };
    
    if (isAdmin) {
        options.reply_markup.keyboard.unshift([
            { text: '🚀 Create Server' },
            { text: '📈 Statistics' }
        ]);
    }
    
    options.reply_markup.resize_keyboard = true;
    options.reply_markup.one_time_keyboard = false;
    
    const menuMsg = `
📱 *XCASPER HOSTING MENU*

Choose an option below or type a command.

${isAdmin ? '👑 *Admin Mode:* Full access enabled' : '🔒 *User Mode:* Basic access'}

*Quick Commands:*
• /help - All commands
• /status - System status
• /ping - Connection test

*Support:* @casper_tech_ke
`;
    
    bot.sendMessage(chatId, menuMsg, { 
        parse_mode: 'Markdown',
        reply_markup: options.reply_markup 
    });
});

// Handle button clicks
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (!text || text.startsWith('/')) return;
    
    switch(text) {
        case '📊 Status':
            bot.emit('text', { ...msg, text: '/status' });
            break;
        case '❓ Help':
            bot.emit('text', { ...msg, text: '/help' });
            break;
        case '🏓 Ping Test':
            bot.emit('text', { ...msg, text: '/ping' });
            break;
        case '🚀 Create Server':
            const isAdmin = config.AUTHORIZED_ADMINS && config.AUTHORIZED_ADMINS.includes(chatId);
            if (isAdmin) {
                bot.sendMessage(chatId, 'Choose server type:\n\n/unli - Unlimited\n/2gb - 2GB Server\n/3gb - 3GB Server\n/5gb - 5GB Server');
            } else {
                bot.sendMessage(chatId, '❌ Admin access required for server creation.');
            }
            break;
        case '📈 Statistics':
            const isAdmin2 = config.AUTHORIZED_ADMINS && config.AUTHORIZED_ADMINS.includes(chatId);
            if (isAdmin2) {
                // Try to trigger stats command if exists
                if (commands.stats) {
                    bot.emit('text', { ...msg, text: '/stats' });
                } else {
                    bot.sendMessage(chatId, '📊 Statistics command not available yet.');
                }
            } else {
                bot.sendMessage(chatId, '❌ Admin access required.');
            }
            break;
    }
});

// Handle unknown commands
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (text && text.startsWith('/')) {
        const command = text.split(' ')[0];
        
        // Check if it's a server creation command
        if (command.match(/^\/(unli|[1-9]0?gb)$/)) {
            const isAdmin = config.AUTHORIZED_ADMINS && config.AUTHORIZED_ADMINS.includes(chatId);
            if (!isAdmin) {
                return bot.sendMessage(chatId, '❌ You are not authorized to use this command.\n\nContact @casper_tech_ke for admin access.');
            }
            // The createserver command will handle this
            return;
        }
        
        // Check if command exists in our loaded commands
        const commandName = command.substring(1);
        if (!commands[commandName] && !['start', 'help', 'status', 'ping', 'menu'].includes(commandName)) {
            bot.sendMessage(chatId, `❌ Unknown command: ${command}\n\nUse /help to see available commands.`);
        }
    }
});

// Bot ready message
console.log('\n' + '='.repeat(50));
console.log('✅ Bot initialized successfully!');
console.log(`📱 Bot username: @${bot.options.username || 'Unknown'}`);
console.log(`👥 Authorized admins: ${config.AUTHORIZED_ADMINS ? config.AUTHORIZED_ADMINS.length : 0}`);
console.log(`📊 Commands loaded: ${Object.keys(commands).length}`);
console.log(`🔄 Polling: Active`);
console.log('='.repeat(50));
console.log('\n🚀 Bot is now listening for commands...\n');

// Export for testing
module.exports = { bot, config };