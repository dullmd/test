const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Use config values with fallbacks
const PANEL_DOMAIN = config.PANEL_DOMAIN || 'https://host.xcasper.site';
const PANEL_API_KEY = config.PANEL_API_KEY || '';
const GLOBAL_EGG = config.GLOBAL_EGG || '15';
const GLOBAL_LOCATION = config.GLOBAL_LOCATION || '1';

// Database file path
const DATABASE_FILE = path.join(__dirname, 'database.json');

// Load or initialize database
let database = {
    users: [],
    servers: [],
    creations: []
};

function loadDatabase() {
    try {
        if (fs.existsSync(DATABASE_FILE)) {
            const data = fs.readFileSync(DATABASE_FILE, 'utf8');
            database = JSON.parse(data);
            console.log(`📁 Loaded database: ${database.creations.length} creations`);
        }
    } catch (err) {
        console.error('❌ Error loading database:', err.message);
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(database, null, 2), 'utf8');
    } catch (err) {
        console.error('❌ Error saving database:', err.message);
    }
}

// Load database on startup
loadDatabase();

function getLimits(type) {
    if (!type) return { memory: 1024, cpu: 50, disk: 2048 };
    
    if(type === 'unli') return { memory: 0, cpu: 0, disk: 0 };
    
    // Extract number from command (e.g., "2gb" -> 2)
    const match = type.match(/(\d+)/);
    if (!match) return { memory: 1024, cpu: 50, disk: 2048 };
    
    const ramGB = parseInt(match[1]);
    const ramMB = ramGB * 1024; // GB → MB
    return { 
        memory: ramMB, 
        cpu: 50, 
        disk: ramMB * 2 // Disk 2x RAM
    };
}

function generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function saveUserData(userData, serverData, adminChatId, type) {
    const creationRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        adminChatId: adminChatId,
        type: type,
        user: {
            email: userData.email,
            username: userData.username,
            password: userData.password,
            panelUserId: userData.panelUserId,
            telegramId: userData.telegramID || adminChatId
        },
        server: {
            name: serverData.name,
            serverId: serverData.id,
            memory: serverData.memory,
            cpu: serverData.cpu,
            disk: serverData.disk
        },
        panelInfo: {
            url: PANEL_DOMAIN,
            location: GLOBAL_LOCATION,
            egg: GLOBAL_EGG
        }
    };

    // Initialize arrays if they don't exist
    if (!database.creations) database.creations = [];
    if (!database.users) database.users = [];
    if (!database.servers) database.servers = [];

    // Add to database
    database.creations.push(creationRecord);
    database.users.push({
        ...creationRecord.user,
        creationId: creationRecord.id,
        createdAt: creationRecord.timestamp
    });
    database.servers.push({
        ...creationRecord.server,
        creationId: creationRecord.id,
        createdAt: creationRecord.timestamp
    });

    // Save to file
    saveDatabase();

    return creationRecord;
}

module.exports = function createServerCommand(bot, AUTHORIZED_ADMINS = []) {
    console.log(`👑 Createserver command initialized for ${AUTHORIZED_ADMINS.length} admins`);
    
    // Store user creation sessions
    const userSessions = new Map();

    bot.onText(/\/(unli|[1-9]0?gb)/, async (msg) => {
        const chatId = msg.chat.id;
        
        // Check authorization - FIXED ERROR HERE
        if (!AUTHORIZED_ADMINS || !AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to use this command.\n\nContact @casper_tech_ke for admin access.');
        }

        const type = msg.text.split(' ')[0].substring(1); // Remove the '/' from command

        // Initialize session for this user
        userSessions.set(chatId, {
            step: 'awaiting_email',
            type: type,
            data: {},
            retryCount: 0,
            maxRetries: 3
        });

        // Ask for email first
        bot.sendMessage(chatId, `📧 Please provide the email address for the new user:\n\nServer Type: ${type.toUpperCase()}`);
    });

    // Cancel command to abort the process
    bot.onText(/\/cancel/, async (msg) => {
        const chatId = msg.chat.id;
        if(userSessions.has(chatId)) {
            userSessions.delete(chatId);
            bot.sendMessage(chatId, '❌ Creation process cancelled.');
        }
    });

    // Stats command to view creation statistics
    bot.onText(/\/stats/, async (msg) => {
        const chatId = msg.chat.id;
        
        // Check authorization
        if (!AUTHORIZED_ADMINS || !AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to view statistics.');
        }

        const totalCreations = database.creations ? database.creations.length : 0;
        const today = new Date().toLocaleDateString();
        const todayCreations = database.creations ? database.creations.filter(c => c.date === today).length : 0;

        const typeCounts = {};
        if (database.creations) {
            database.creations.forEach(c => {
                typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
            });
        }

        let statsMessage = `📊 **Creation Statistics**\n\n`;
        statsMessage += `📅 Total Creations: ${totalCreations}\n`;
        statsMessage += `📈 Today's Creations: ${todayCreations}\n\n`;
        
        if (Object.keys(typeCounts).length > 0) {
            statsMessage += `**By Type:**\n`;
            for (const [type, count] of Object.entries(typeCounts)) {
                statsMessage += `• ${type.toUpperCase()}: ${count}\n`;
            }
        } else {
            statsMessage += `No creations yet.\n`;
        }

        statsMessage += `\n💾 Database file: database.json`;

        bot.sendMessage(chatId, statsMessage);
    });

    // List command to view recent creations
    bot.onText(/\/list(?: (\d+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        
        // Check authorization
        if (!AUTHORIZED_ADMINS || !AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to view the list.');
        }

        const limit = match && match[1] ? parseInt(match[1]) : 10;
        const recentCreations = database.creations ? database.creations.slice(-limit).reverse() : [];

        if (recentCreations.length === 0) {
            return bot.sendMessage(chatId, '📭 No creations found in database.');
        }

        let listMessage = `📋 **Recent Creations (Last ${recentCreations.length})**\n\n`;

        recentCreations.forEach((creation, index) => {
            listMessage += `${index + 1}. **${creation.user.username}**\n`;
            listMessage += `   📧 ${creation.user.email}\n`;
            listMessage += `   📱 TG: ${creation.user.telegramId}\n`;
            listMessage += `   📊 Type: ${creation.type ? creation.type.toUpperCase() : 'N/A'}\n`;
            listMessage += `   📅 ${creation.date || 'N/A'} ${creation.time || ''}\n`;
            listMessage += `   ──────────────\n`;
        });

        bot.sendMessage(chatId, listMessage);
    });

    // Handle all messages to check if we're in a creation flow
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const session = userSessions.get(chatId);

        if (!session || !msg.text || msg.text.startsWith('/')) return; // Not in session or new command

        const userMessage = msg.text.trim();

        try {
            switch(session.step) {
                case 'awaiting_email':
                    // Validate email
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if(!emailRegex.test(userMessage)) {
                        return bot.sendMessage(chatId, '❌ Invalid email format. Please provide a valid email address:');
                    }

                    session.data.email = userMessage;
                    session.step = 'awaiting_username';
                    session.retryCount = 0; // Reset retry count for new username attempts
                    userSessions.set(chatId, session);

                    bot.sendMessage(chatId, '👤 Please provide the username for the new user:');
                    break;

                case 'awaiting_username':
                case 'retry_username': // Added retry_username state
                    // Validate username
                    const usernameRegex = /^[a-zA-Z0-9_]+$/;
                    if(!usernameRegex.test(userMessage)) {
                        return bot.sendMessage(chatId, '❌ Invalid username. Use only letters, numbers, and underscores. Please provide a valid username:');
                    }

                    session.data.username = userMessage;
                    session.step = 'awaiting_telegram';
                    userSessions.set(chatId, session);

                    bot.sendMessage(chatId, '📱 Please provide the Telegram ID to send credentials to (or type "skip" to send here):');
                    break;

                case 'awaiting_telegram':
                    let telegramID = chatId; // Default to admin chat

                    if (userMessage.toLowerCase() !== 'skip') {
                        if (!/^\d+$/.test(userMessage)) {
                            return bot.sendMessage(chatId, '❌ Invalid Telegram ID. Please provide a numeric Telegram ID or type "skip":');
                        }
                        telegramID = userMessage;
                    }

                    session.data.telegramID = telegramID;
                    userSessions.set(chatId, session);

                    // Now we have all data, start creation process
                    await createUserAndServer(bot, chatId, session);

                    break;
            }
        } catch (err) {
            console.error('❌ Error in message handler:', err);
            bot.sendMessage(chatId, '❌ Error: ' + err.message);
            userSessions.delete(chatId); // Clear session on error
        }
    });

    async function createUserAndServer(bot, chatId, session) {
        const { email, username, telegramID } = session.data;
        const password = generateRandomPassword();
        const limits = getLimits(session.type);

        try {
            // Show processing message
            const processingMsg = await bot.sendMessage(chatId, `🔄 Creating ${session.type.toUpperCase()} server for ${username}...`);

            // Create user
            const f = await fetch(PANEL_DOMAIN + "/api/application/users", {
                method: "POST",
                headers: { 
                    Accept: "application/json", 
                    "Content-Type": "application/json", 
                    Authorization: "Bearer " + PANEL_API_KEY 
                },
                body: JSON.stringify({ 
                    email, 
                    username, 
                    first_name: username, 
                    last_name: username, 
                    language: "en", 
                    password 
                })
            });
            
            if (!f.ok) {
                throw new Error(`Panel API error: ${f.status} ${f.statusText}`);
            }
            
            const data = await f.json();

            // Check if username is already taken
            if(data.errors) {
                const error = data.errors[0];

                // Check if it's a username conflict error
                if (error.code === "ValidationException" && 
                    error.detail && error.detail.includes("already been taken")) {

                    session.retryCount += 1;

                    if (session.retryCount >= session.maxRetries) {
                        await bot.editMessageText(`❌ Username "${username}" is already taken and you've exceeded the maximum retries (${session.maxRetries}).\n\nPlease use /${session.type} to start over with a different username.`, {
                            chat_id: chatId,
                            message_id: processingMsg.message_id
                        });
                        userSessions.delete(chatId);
                        return;
                    }

                    // Update session to retry username
                    session.step = 'retry_username';
                    userSessions.set(chatId, session);

                    await bot.editMessageText(`❌ Username "${username}" is already taken!\n\n📝 Please provide a different username (Attempt ${session.retryCount}/${session.maxRetries}):\n\nTip: Try adding numbers or underscores, like "${username}1" or "${username}_"`, {
                        chat_id: chatId,
                        message_id: processingMsg.message_id
                    });
                    return;
                }

                // Handle other errors
                await bot.editMessageText('❌ Error: ' + JSON.stringify(error), {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                });
                userSessions.delete(chatId);
                return;
            }

            const user = data.attributes;

            // Get egg startup
            const f2 = await fetch(PANEL_DOMAIN + "/api/application/nests/5/eggs/" + GLOBAL_EGG, {
                method: "GET",
                headers: { 
                    Accept: "application/json", 
                    "Content-Type": "application/json", 
                    Authorization: "Bearer " + PANEL_API_KEY 
                }
            });
            
            if (!f2.ok) {
                throw new Error(`Failed to get egg info: ${f2.status}`);
            }
            
            const data2 = await f2.json();
            const startup_cmd = data2.attributes.startup;

            // Create server
            const f3 = await fetch(PANEL_DOMAIN + "/api/application/servers", {
                method: "POST",
                headers: { 
                    Accept: "application/json", 
                    "Content-Type": "application/json", 
                    Authorization: "Bearer " + PANEL_API_KEY 
                },
                body: JSON.stringify({
                    name: username + ' - ' + session.type.toUpperCase(),
                    description: 'Created with XCASPER Telegram Bot',
                    user: user.id,
                    egg: parseInt(GLOBAL_EGG),
                    docker_image: "ghcr.io/parkervcp/yolks:nodejs_24",
                    startup: startup_cmd,
                    environment: { 
                        INST: "npm", 
                        USER_UPLOAD: "0", 
                        AUTO_UPDATE: "0", 
                        CMD_RUN: "npm start" 
                    },
                    limits: { 
                        memory: limits.memory, 
                        swap: 0, 
                        disk: limits.disk, 
                        io: 500, 
                        cpu: limits.cpu 
                    },
                    feature_limits: { 
                        databases: 5, 
                        backups: 5, 
                        allocations: 5 
                    },
                    deploy: { 
                        locations: [parseInt(GLOBAL_LOCATION)], 
                        dedicated_ip: false, 
                        port_range: [] 
                    }
                })
            });
            
            if (!f3.ok) {
                throw new Error(`Failed to create server: ${f3.status}`);
            }
            
            const res = await f3.json();

            if(res.errors) {
                await bot.editMessageText('❌ Error creating server: ' + JSON.stringify(res.errors[0]), {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                });
                userSessions.delete(chatId);
                return;
            }

            const serverData = res.attributes;

            // Save to database
            const userDataForDb = {
                email: email,
                username: username,
                password: password,
                panelUserId: user.id,
                telegramID: telegramID
            };

            const serverDataForDb = {
                name: serverData.name,
                id: serverData.id,
                memory: limits.memory,
                cpu: limits.cpu,
                disk: limits.disk
            };

            const creationRecord = saveUserData(userDataForDb, serverDataForDb, chatId, session.type);

            // Send credentials
            const messageText = `✅ Your user and server have been created!

📧 Email: ${email}
👤 Username: ${username}
🔐 Password: ${password}
🔗 Panel URL: ${PANEL_DOMAIN}

📊 Server Type: ${session.type.toUpperCase()}
💾 Memory: ${limits.memory > 0 ? limits.memory + 'MB' : 'Unlimited'}
⚡ CPU: ${limits.cpu > 0 ? limits.cpu + '%' : 'Unlimited'}
💿 Disk: ${limits.disk > 0 ? limits.disk + 'MB' : 'Unlimited'}

📅 Created: ${creationRecord.date} ${creationRecord.time}

⚠️ Please change your password after first login!`;

            // Try to send to Telegram ID, fallback to admin chat if fails
            try {
                await bot.sendMessage(telegramID, messageText);
                await bot.editMessageText(`✅ Successfully created user and server for ${username}\n\n📊 Type: ${session.type.toUpperCase()}\n📤 Credentials sent to: ${telegramID}\n📝 Record ID: ${creationRecord.id}\n📅 ${creationRecord.date}`, {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                });
            } catch (err) {
                // If sending to Telegram ID fails, send to admin instead
                await bot.sendMessage(chatId, messageText);
                await bot.editMessageText(`✅ Successfully created user and server for ${username}\n\n📊 Type: ${session.type.toUpperCase()}\n⚠️ Could not send to Telegram ID, credentials sent here instead.\n📝 Record ID: ${creationRecord.id}\n📅 ${creationRecord.date}`, {
                    chat_id: chatId,
                    message_id: processingMsg.message_id
                });
            }

            // Clear session after successful creation
            userSessions.delete(chatId);

        } catch (err) {
            console.error('❌ Error in createUserAndServer:', err);
            bot.sendMessage(chatId, '❌ Unexpected error: ' + err.message);
            userSessions.delete(chatId);
        }
    }
};