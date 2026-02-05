const fetch = require('node-fetch');
const { PANEL_DOMAIN, PANEL_API_KEY, GLOBAL_EGG, GLOBAL_LOCATION } = require('../config');

function getLimits(type) {
    if (type === 'unli') {
        return { memory: 0, cpu: 0, disk: 0 };
    }
    const ram = parseInt(type.replace('gb', '')) * 1024;
    return { memory: ram, cpu: 50, disk: ram * 2 };
}

module.exports = function addServerCommand(bot, AUTHORIZED_ADMINS) {
    
    // Store user sessions for interactive flow
    const userSessions = new Map();

    // Start the interactive flow
    bot.onText(/\/addserver/, async (msg) => {
        const chatId = msg.chat.id;

        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to use this command.');
        }

        // Initialize a new session for this user
        userSessions.set(chatId, {
            step: 'awaiting_server_name',
            data: {}
        });

        bot.sendMessage(
            chatId,
            '🖥️ *Let\'s add a new server!*\n\nPlease enter the **name** for the new server:',
            { parse_mode: 'Markdown' }
        );
    });

    // Cancel command
    bot.onText(/\/cancel/, async (msg) => {
        const chatId = msg.chat.id;
        if (userSessions.has(chatId)) {
            userSessions.delete(chatId);
            bot.sendMessage(chatId, '❌ Server creation process cancelled.');
        }
    });

    // Handle interactive messages
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const session = userSessions.get(chatId);
        
        if (!session || msg.text.startsWith('/')) return;

        const userInput = msg.text.trim();

        try {
            switch (session.step) {
                case 'awaiting_server_name':
                    if (userInput.length < 2) {
                        return bot.sendMessage(
                            chatId,
                            '⚠️ Server name is too short. Please enter a name with at least 2 characters:'
                        );
                    }
                    
                    session.data.serverName = userInput;
                    session.step = 'awaiting_ram_type';
                    userSessions.set(chatId, session);
                    
                    bot.sendMessage(
                        chatId,
                        '💾 *Select RAM Type:*\n\nPlease choose one of the following:\n• `1gb`\n• `2gb`\n• `4gb`\n• `unli`\n\n*Type your choice:*',
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case 'awaiting_ram_type':
                    const validRamTypes = ['1gb', '2gb', '3gb', '4gb', '5gb', '6gb', '7gb', '8gb', '9gb', '10gb', 'unli'];
                    const ramType = userInput.toLowerCase();
                    
                    if (!validRamTypes.includes(ramType)) {
                        return bot.sendMessage(
                            chatId,
                            `⚠️ Invalid RAM type. Please choose from: ${validRamTypes.join(', ')}\n\n*Example:* \`2gb\` or \`unli\``,
                            { parse_mode: 'Markdown' }
                        );
                    }
                    
                    session.data.ramType = ramType;
                    session.step = 'awaiting_username';
                    userSessions.set(chatId, session);
                    
                    bot.sendMessage(
                        chatId,
                        '👤 *Enter Username*\n\nPlease enter the **username** of the panel user who will own this server:',
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case 'awaiting_username':
                    if (userInput.length < 3) {
                        return bot.sendMessage(
                            chatId,
                            '⚠️ Username is too short. Please enter a valid username (at least 3 characters):'
                        );
                    }
                    
                    session.data.username = userInput;
                    userSessions.set(chatId, session);
                    
                    // Start the creation process
                    await createServerInteractive(bot, chatId, session.data);
                    
                    // Clear the session
                    userSessions.delete(chatId);
                    break;
            }
        } catch (err) {
            bot.sendMessage(chatId, '❌ An error occurred: ' + err.message);
            userSessions.delete(chatId);
        }
    });
};

async function createServerInteractive(bot, chatId, data) {
    const { serverName, ramType, username } = data;
    const limits = getLimits(ramType);

    try {
        // Send processing message
        const processingMsg = await bot.sendMessage(
            chatId,
            `🔍 *Checking user "${username}" and creating server...*`,
            { parse_mode: 'Markdown' }
        );

        // 1️⃣ Find panel user by username
        const usersRes = await fetch(`${PANEL_DOMAIN}/api/application/users`, {
            headers: {
                Accept: 'application/json',
                Authorization: 'Bearer ' + PANEL_API_KEY
            }
        });
        
        if (!usersRes.ok) {
            throw new Error(`Failed to fetch users: ${usersRes.status}`);
        }
        
        const usersData = await usersRes.json();
        const user = usersData.data?.find(u => u.attributes.username === username);

        if (!user) {
            await bot.editMessageText(
                `❌ *User Not Found*\n\nUser *${username}* does not exist in the panel.\n\nPlease verify the username and try again, or use \`/cancel\` to abort.`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id,
                    parse_mode: 'Markdown'
                }
            );
            return;
        }

        const userId = user.attributes.id;

        // 2️⃣ Get egg startup command
        const eggRes = await fetch(
            `${PANEL_DOMAIN}/api/application/nests/5/eggs/${GLOBAL_EGG}`,
            {
                headers: {
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + PANEL_API_KEY
                }
            }
        );
        
        if (!eggRes.ok) {
            throw new Error(`Failed to fetch egg details: ${eggRes.status}`);
        }
        
        const eggData = await eggRes.json();
        const startup_cmd = eggData.attributes.startup;

        // 3️⃣ Create server
        const serverRes = await fetch(`${PANEL_DOMAIN}/api/application/servers`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + PANEL_API_KEY
            },
            body: JSON.stringify({
                name: `${serverName} - ${ramType.toUpperCase()}`,
                description: 'Added via Telegram Bot',
                user: userId,
                egg: parseInt(GLOBAL_EGG),
                docker_image: 'ghcr.io/parkervcp/yolks:nodejs_24',
                startup: startup_cmd,
                environment: {
                    INST: 'npm',
                    USER_UPLOAD: '0',
                    AUTO_UPDATE: '0',
                    CMD_RUN: 'npm start'
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

        const serverData = await serverRes.json();
        
        if (serverData.errors) {
            const errorMsg = serverData.errors[0]?.detail || JSON.stringify(serverData.errors[0]);
            await bot.editMessageText(
                `❌ *Server Creation Failed*\n\nError: ${errorMsg}\n\nPlease try again or contact support.`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id,
                    parse_mode: 'Markdown'
                }
            );
            return;
        }

        // Success message
        await bot.editMessageText(
            `✅ *Server Created Successfully!*\n\n` +
            `🖥️ *Name:* ${serverName}\n` +
            `👤 *Owner:* ${username}\n` +
            `💾 *RAM Type:* ${ramType.toUpperCase()}\n` +
            `🧠 *Memory:* ${limits.memory || 'Unlimited'} MB\n` +
            `⚡ *CPU:* ${limits.cpu || 'Unlimited'}%\n` +
            `💿 *Disk:* ${limits.disk || 'Unlimited'} MB\n\n` +
            `*The server is now being deployed and should be ready shortly.*`,
            {
                chat_id: chatId,
                message_id: processingMsg.message_id,
                parse_mode: 'Markdown'
            }
        );

    } catch (err) {
        bot.sendMessage(
            chatId,
            `❌ *Unexpected Error*\n\nAn error occurred: ${err.message}\n\nPlease try again or check the bot logs.`,
            { parse_mode: 'Markdown' }
        );
    }
}