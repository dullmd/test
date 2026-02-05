const fetch = require('node-fetch');
const { PANEL_DOMAIN, PANEL_API_KEY } = require('../config');

module.exports = function cadminPanelCommand(bot, AUTHORIZED_ADMINS) {
    // Store admin creation sessions
    const adminSessions = new Map();

    // Start admin creation flow
    bot.onText(/\/cadminpanel/, async (msg) => {
        const chatId = msg.chat.id;

        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, "❌ You are not authorized to create panel admins.");
        }

        // Initialize session
        adminSessions.set(chatId, {
            step: 'awaiting_username',
            data: {}
        });

        bot.sendMessage(
            chatId,
            "⚡ *Panel Admin Creation*\n\nPlease enter the **username** for the new admin:",
            { parse_mode: "Markdown" }
        );
    });

    // Cancel command
    bot.onText(/\/cancel_admin/, async (msg) => {
        const chatId = msg.chat.id;
        if (adminSessions.has(chatId)) {
            adminSessions.delete(chatId);
            bot.sendMessage(chatId, "❌ Admin creation process cancelled.");
        }
    });

    // Handle interactive messages
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const session = adminSessions.get(chatId);
        
        if (!session || msg.text.startsWith('/')) return;

        const userInput = msg.text.trim();

        try {
            switch (session.step) {
                case 'awaiting_username':
                    // Validate username
                    if (userInput.length < 3) {
                        return bot.sendMessage(
                            chatId,
                            "⚠️ Username is too short. Please enter a username with at least 3 characters:"
                        );
                    }
                    
                    // Check for special characters (optional)
                    const usernameRegex = /^[a-zA-Z0-9_]+$/;
                    if (!usernameRegex.test(userInput)) {
                        return bot.sendMessage(
                            chatId,
                            "⚠️ Invalid username. Use only letters, numbers, and underscores.\n\nPlease enter a valid username:"
                        );
                    }
                    
                    session.data.username = userInput;
                    session.step = 'awaiting_email';
                    adminSessions.set(chatId, session);
                    
                    bot.sendMessage(
                        chatId,
                        "📧 *Enter Email*\n\nPlease enter the **email address** for the admin:",
                        { parse_mode: "Markdown" }
                    );
                    break;

                case 'awaiting_email':
                    // Validate email
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(userInput)) {
                        return bot.sendMessage(
                            chatId,
                            "⚠️ Invalid email format. Please enter a valid email address:"
                        );
                    }
                    
                    session.data.email = userInput;
                    
                    // Confirm before creation
                    bot.sendMessage(
                        chatId,
                        `📋 *Confirm Admin Creation*\n\n` +
                        `👤 **Username:** ${session.data.username}\n` +
                        `📧 **Email:** ${session.data.email}\n` +
                        `🔐 **Password:** ${session.data.username}Admin001\n` +
                        `⚡ **Role:** Panel Administrator\n\n` +
                        `*Are you sure you want to create this admin?*\n\n` +
                        `Type \`confirm\` to proceed or \`cancel\` to abort.`,
                        { parse_mode: "Markdown" }
                    );
                    
                    session.step = 'awaiting_confirmation';
                    adminSessions.set(chatId, session);
                    break;

                case 'awaiting_confirmation':
                    if (userInput.toLowerCase() === 'confirm') {
                        // Proceed with creation
                        await createPanelAdmin(bot, chatId, session.data);
                        adminSessions.delete(chatId);
                    } else if (userInput.toLowerCase() === 'cancel') {
                        bot.sendMessage(chatId, "❌ Admin creation cancelled.");
                        adminSessions.delete(chatId);
                    } else {
                        bot.sendMessage(
                            chatId,
                            "⚠️ Please type `confirm` to create the admin or `cancel` to abort.",
                            { parse_mode: "Markdown" }
                        );
                    }
                    break;
            }
        } catch (err) {
            bot.sendMessage(chatId, "❌ An error occurred: " + err.message);
            adminSessions.delete(chatId);
        }
    });
};

async function createPanelAdmin(bot, chatId, data) {
    const { username, email } = data;
    const password = username + "Admin001";

    try {
        // Send processing message
        const processingMsg = await bot.sendMessage(
            chatId,
            `🔧 *Creating admin user "${username}"...*`,
            { parse_mode: "Markdown" }
        );

        // Check if user already exists
        try {
            const checkRes = await fetch(`${PANEL_DOMAIN}/api/application/users`, {
                headers: {
                    Accept: "application/json",
                    Authorization: "Bearer " + PANEL_API_KEY
                }
            });
            
            if (checkRes.ok) {
                const usersData = await checkRes.json();
                const existingUser = usersData.data?.find(u => 
                    u.attributes.username === username || u.attributes.email === email
                );
                
                if (existingUser) {
                    await bot.editMessageText(
                        `❌ *User Already Exists*\n\n` +
                        `A user with username "${username}" or email "${email}" already exists in the panel.\n\n` +
                        `Please use a different username or email.`,
                        {
                            chat_id: chatId,
                            message_id: processingMsg.message_id,
                            parse_mode: "Markdown"
                        }
                    );
                    return;
                }
            }
        } catch (checkErr) {
            console.log("Could not check existing users, proceeding anyway:", checkErr.message);
        }

        // Create admin user via Pterodactyl API
        const res = await fetch(PANEL_DOMAIN + "/api/application/users", {
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
                last_name: "Admin",
                language: "en",
                password,
                root_admin: true   // THIS MAKES THE USER A PANEL ADMIN
            })
        });

        const responseData = await res.json();

        if (res.status === 422 && responseData.errors) {
            // Handle validation errors
            const error = responseData.errors[0];
            let errorMessage = `❌ *Creation Failed*\n\n`;
            
            if (error.detail?.includes("already been taken")) {
                if (error.meta?.source_field === "email") {
                    errorMessage += `Email **${email}** is already registered.\n\nPlease use a different email address.`;
                } else if (error.meta?.source_field === "username") {
                    errorMessage += `Username **${username}** is already taken.\n\nPlease use a different username.`;
                }
            } else {
                errorMessage += `Error: ${error.detail || JSON.stringify(error)}`;
            }
            
            await bot.editMessageText(
                errorMessage,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id,
                    parse_mode: "Markdown"
                }
            );
            return;
        }

        if (!res.ok) {
            throw new Error(`API returned ${res.status}: ${JSON.stringify(responseData)}`);
        }

        // Success message
        const message = `
✅ *Panel Admin User Created Successfully!*

👤 **Username:** ${username}
📧 **Email:** ${email}
🔐 **Password:** ${password}
⚡ **Role:** Administrator (Full Access)
🔗 **Panel:** ${PANEL_DOMAIN}

⚠️ **IMPORTANT SECURITY NOTICE:**
1. The new admin must change their password immediately
2. Consider enabling 2FA for the account
3. Only share credentials via secure channels

📝 *Record this information in a secure location.*
`;

        await bot.editMessageText(
            message,
            {
                chat_id: chatId,
                message_id: processingMsg.message_id,
                parse_mode: "Markdown"
            }
        );

    } catch (err) {
        bot.sendMessage(
            chatId,
            `❌ *Unexpected Error*\n\nCould not create admin user: ${err.message}\n\nPlease check panel connectivity and try again.`,
            { parse_mode: "Markdown" }
        );
    }
}