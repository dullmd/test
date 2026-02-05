const fetch = require('node-fetch');
const { PANEL_DOMAIN, PANEL_API_KEY } = require('../config');

module.exports = function createUserCommand(bot, AUTHORIZED_ADMINS) {
    // Store user creation sessions
    const userSessions = new Map();

    // Start user creation flow
    bot.onText(/\/createuser/, async (msg) => {
        const chatId = msg.chat.id;

        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to create panel users.');
        }

        // Initialize session
        userSessions.set(chatId, {
            step: 'awaiting_username',
            data: {},
            attempts: 0,
            maxAttempts: 3
        });

        bot.sendMessage(
            chatId,
            '👤 *Panel User Creation*\n\nPlease enter the **username** for the new user:',
            { parse_mode: 'Markdown' }
        );
    });

    // Cancel command
    bot.onText(/\/cancel_user/, async (msg) => {
        const chatId = msg.chat.id;
        if (userSessions.has(chatId)) {
            userSessions.delete(chatId);
            bot.sendMessage(chatId, '❌ User creation process cancelled.');
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
                case 'awaiting_username':
                    // Validate username
                    if (userInput.length < 3) {
                        return bot.sendMessage(
                            chatId,
                            '⚠️ Username is too short. Please enter a username with at least 3 characters:'
                        );
                    }
                    
                    // Check for valid characters
                    const usernameRegex = /^[a-zA-Z0-9_]+$/;
                    if (!usernameRegex.test(userInput)) {
                        return bot.sendMessage(
                            chatId,
                            '⚠️ Invalid username. Use only letters, numbers, and underscores.\n\nPlease enter a valid username:'
                        );
                    }
                    
                    session.data.username = userInput;
                    session.step = 'awaiting_email';
                    userSessions.set(chatId, session);
                    
                    bot.sendMessage(
                        chatId,
                        '📧 *Enter Email*\n\nPlease enter the **email address** for the user:',
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case 'awaiting_email':
                    // Validate email format
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(userInput)) {
                        return bot.sendMessage(
                            chatId,
                            '⚠️ Invalid email format. Please enter a valid email address:'
                        );
                    }
                    
                    session.data.email = userInput;
                    
                    // Show confirmation with auto-generated password
                    const generatedPassword = session.data.username + '001';
                    
                    bot.sendMessage(
                        chatId,
                        `📋 *Confirm User Creation*\n\n` +
                        `👤 **Username:** ${session.data.username}\n` +
                        `📧 **Email:** ${session.data.email}\n` +
                        `🔐 **Password:** ${generatedPassword}\n` +
                        `👑 **Role:** Regular User (Not Admin)\n` +
                        `🔗 **Panel:** ${PANEL_DOMAIN}\n\n` +
                        `*Do you want to create this user?*\n\n` +
                        `Type \`create\` to proceed or \`cancel\` to abort.`,
                        { parse_mode: 'Markdown' }
                    );
                    
                    session.step = 'awaiting_confirmation';
                    userSessions.set(chatId, session);
                    break;

                case 'awaiting_confirmation':
                    if (userInput.toLowerCase() === 'create') {
                        // Proceed with creation
                        await createPanelUser(bot, chatId, session.data);
                        userSessions.delete(chatId);
                    } else if (userInput.toLowerCase() === 'cancel') {
                        bot.sendMessage(chatId, '❌ User creation cancelled.');
                        userSessions.delete(chatId);
                    } else {
                        bot.sendMessage(
                            chatId,
                            '⚠️ Please type `create` to create the user or `cancel` to abort.',
                            { parse_mode: 'Markdown' }
                        );
                    }
                    break;
            }
        } catch (err) {
            bot.sendMessage(chatId, '❌ An error occurred: ' + err.message);
            userSessions.delete(chatId);
        }
    });
};

async function createPanelUser(bot, chatId, data) {
    const { username, email } = data;
    const password = username + '001';

    try {
        // Send processing message
        const processingMsg = await bot.sendMessage(
            chatId,
            `🔍 *Checking availability and creating user "${username}"...*`,
            { parse_mode: 'Markdown' }
        );

        // Check if user already exists
        let existingUser = null;
        try {
            const checkRes = await fetch(`${PANEL_DOMAIN}/api/application/users`, {
                headers: {
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + PANEL_API_KEY
                }
            });
            
            if (checkRes.ok) {
                const usersData = await checkRes.json();
                existingUser = usersData.data?.find(u => 
                    u.attributes.username.toLowerCase() === username.toLowerCase() || 
                    u.attributes.email.toLowerCase() === email.toLowerCase()
                );
                
                if (existingUser) {
                    let conflictType = '';
                    if (existingUser.attributes.username.toLowerCase() === username.toLowerCase()) {
                        conflictType = 'username';
                    } else {
                        conflictType = 'email';
                    }
                    
                    await bot.editMessageText(
                        `❌ *User Already Exists*\n\n` +
                        `A user with this ${conflictType} already exists in the panel:\n\n` +
                        `• **Username:** ${existingUser.attributes.username}\n` +
                        `• **Email:** ${existingUser.attributes.email}\n` +
                        `• **ID:** ${existingUser.attributes.id}\n\n` +
                        `Please use a different ${conflictType}.`,
                        {
                            chat_id: chatId,
                            message_id: processingMsg.message_id,
                            parse_mode: 'Markdown'
                        }
                    );
                    return;
                }
            }
        } catch (checkErr) {
            console.log('Could not check existing users, proceeding anyway:', checkErr.message);
        }

        // Create panel user
        const res = await fetch(`${PANEL_DOMAIN}/api/application/users`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + PANEL_API_KEY
            },
            body: JSON.stringify({
                email,
                username,
                first_name: username,
                last_name: 'User',
                language: 'en',
                password,
                root_admin: false
            })
        });

        const responseData = await res.json();

        if (res.status === 422 && responseData.errors) {
            // Handle validation errors
            const error = responseData.errors[0];
            let errorMessage = `❌ *Creation Failed*\n\n`;
            
            if (error.detail?.includes('already been taken')) {
                if (error.meta?.source_field === 'email') {
                    errorMessage += `Email **${email}** is already registered.\n\n` +
                                   `Please use a different email address or ask the user to recover their account.`;
                } else if (error.meta?.source_field === 'username') {
                    errorMessage += `Username **${username}** is already taken.\n\n` +
                                   `Please use a different username. Suggestions:\n` +
                                   `• ${username}1\n` +
                                   `• ${username}_\n` +
                                   `• ${username}user`;
                }
            } else {
                errorMessage += `Error: ${error.detail || JSON.stringify(error)}`;
            }
            
            await bot.editMessageText(
                errorMessage,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id,
                    parse_mode: 'Markdown'
                }
            );
            return;
        }

        if (!res.ok) {
            throw new Error(`API returned ${res.status}: ${JSON.stringify(responseData)}`);
        }

        const user = responseData.attributes;

        // Success message with credentials
        const successMessage = `
✅ *Panel User Created Successfully!*

👤 **Username:** ${user.username}
📧 **Email:** ${user.email}
🔐 **Password:** ${password}
🆔 **User ID:** ${user.id}
🔗 **Panel:** ${PANEL_DOMAIN}

⚠️ **Important Instructions:**
1. **Immediately change password** after first login
2. This user can only manage their own servers
3. Contact support if login issues occur

📝 **Share these credentials securely with the user.**
`;

        await bot.editMessageText(
            successMessage,
            {
                chat_id: chatId,
                message_id: processingMsg.message_id,
                parse_mode: 'Markdown'
            }
        );

        // Optional: Send to user if Telegram ID is known
        // You could add Telegram ID collection to the flow if needed
        // await bot.sendMessage(userTelegramId, `Your panel account has been created...`);

    } catch (err) {
        bot.sendMessage(
            chatId,
            `❌ *Unexpected Error*\n\nCould not create user: ${err.message}\n\nPlease check panel connectivity and try again.`,
            { parse_mode: 'Markdown' }
        );
    }
}