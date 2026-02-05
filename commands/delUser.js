const fetch = require('node-fetch');
const { PANEL_DOMAIN, PANEL_API_KEY } = require('../config');

module.exports = function delUserCommand(bot, AUTHORIZED_ADMINS) {
    // Store deletion sessions
    const deletionSessions = new Map();
    
    // Store fetched data cache
    const dataCache = new Map();
    const CACHE_DURATION = 30000; // 30 seconds

    // Start deletion flow
    bot.onText(/\/deluser/, async (msg) => {
        const chatId = msg.chat.id;

        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to delete users.');
        }

        try {
            // Send loading message
            const loadingMsg = await bot.sendMessage(
                chatId,
                '📡 *Fetching user list...*',
                { parse_mode: 'Markdown' }
            );

            // Fetch users
            const users = await fetchUsers();
            if (!users || users.length === 0) {
                await bot.editMessageText(
                    '❌ *No users found* in the panel.',
                    {
                        chat_id: chatId,
                        message_id: loadingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
                return;
            }

            // Check for root admins (prevent accidental deletion)
            const rootAdmins = users.filter(u => u.attributes.root_admin);
            const regularUsers = users.filter(u => !u.attributes.root_admin);

            // Store in cache
            dataCache.set(chatId, {
                allUsers: users,
                regularUsers: regularUsers,
                rootAdmins: rootAdmins,
                timestamp: Date.now()
            });

            // Create user list message
            let userList = '📋 *Select a User to Delete*\n\n';
            
            if (regularUsers.length > 0) {
                userList += '👤 *Regular Users:*\n';
                regularUsers.forEach((user, index) => {
                    const userInfo = user.attributes;
                    userList += `${index + 1}. **${userInfo.username}**\n`;
                    userList += `   📧 ${userInfo.email}\n`;
                    userList += `   🆔 ID: ${userInfo.id}\n`;
                    userList += `   ──────────────\n`;
                });
            }
            
            if (rootAdmins.length > 0) {
                userList += '\n👑 *Administrators (Use with CAUTION):*\n';
                rootAdmins.forEach((admin, index) => {
                    const adminInfo = admin.attributes;
                    userList += `${regularUsers.length + index + 1}. **${adminInfo.username}** ⚠️ ADMIN\n`;
                    userList += `   📧 ${adminInfo.email}\n`;
                    userList += `   🆔 ID: ${adminInfo.id}\n`;
                    userList += `   ──────────────\n`;
                });
            }

            userList += '\n*Reply with the **user number** or **username/ID** to select:*';

            await bot.editMessageText(
                userList,
                {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: 'Markdown'
                }
            );

            // Initialize deletion session
            deletionSessions.set(chatId, {
                step: 'selecting_user',
                allUsers: users,
                regularUsers: regularUsers,
                rootAdmins: rootAdmins
            });

        } catch (err) {
            bot.sendMessage(
                chatId,
                `❌ *Failed to fetch users*\n\nError: ${err.message}`,
                { parse_mode: 'Markdown' }
            );
        }
    });

    // Cancel command
    bot.onText(/\/cancel_userdelete/, async (msg) => {
        const chatId = msg.chat.id;
        if (deletionSessions.has(chatId)) {
            deletionSessions.delete(chatId);
            bot.sendMessage(chatId, '❌ User deletion cancelled.');
        }
    });

    // Handle interactive messages
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const session = deletionSessions.get(chatId);
        
        if (!session || msg.text.startsWith('/')) return;

        const userInput = msg.text.trim();

        try {
            switch (session.step) {
                case 'selecting_user':
                    await handleUserSelection(bot, chatId, session, userInput);
                    break;
                    
                case 'checking_servers':
                    await handleServerCheck(bot, chatId, session, userInput);
                    break;
                    
                case 'confirming_deletion':
                    await handleDeletionConfirmation(bot, chatId, session, userInput);
                    break;
            }
        } catch (err) {
            bot.sendMessage(chatId, '❌ An error occurred: ' + err.message);
            deletionSessions.delete(chatId);
        }
    });

    async function fetchUsers() {
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
            if (data.errors) throw new Error(JSON.stringify(data.errors[0]));
            
            return data.data || [];
        } catch (err) {
            console.error('Error fetching users:', err);
            throw err;
        }
    }

    async function fetchUserServers(userId) {
        try {
            const res = await fetch(`${PANEL_DOMAIN}/api/application/users/${userId}?include=servers`, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + PANEL_API_KEY
                }
            });

            const data = await res.json();
            if (data.errors) throw new Error(JSON.stringify(data.errors[0]));
            
            return data.attributes?.relationships?.servers?.data || [];
        } catch (err) {
            console.error('Error fetching user servers:', err);
            return [];
        }
    }

    async function handleUserSelection(bot, chatId, session, userInput) {
        const allUsers = session.allUsers;
        let selectedUser = null;

        // Try to find by number (1, 2, 3...)
        const userNumber = parseInt(userInput);
        if (!isNaN(userNumber) && userNumber >= 1 && userNumber <= allUsers.length) {
            selectedUser = allUsers[userNumber - 1];
        } else {
            // Try to find by ID, username, or email
            selectedUser = allUsers.find(u => 
                u.attributes.id.toString() === userInput || 
                u.attributes.username.toLowerCase() === userInput.toLowerCase() ||
                u.attributes.email.toLowerCase() === userInput.toLowerCase()
            );
        }

        if (!selectedUser) {
            return bot.sendMessage(
                chatId,
                `❌ *User not found*\n\n"${userInput}" does not match any user.\n\nPlease enter a valid user number, username, or ID:`
            );
        }

        const userInfo = selectedUser.attributes;

        // Store selected user in session
        session.selectedUser = selectedUser;
        session.step = 'checking_servers';
        deletionSessions.set(chatId, session);

        // Check if user has servers
        const processingMsg = await bot.sendMessage(
            chatId,
            `🔍 *Checking if user "${userInfo.username}" owns any servers...*`,
            { parse_mode: 'Markdown' }
        );

        const userServers = await fetchUserServers(userInfo.id);

        if (userServers.length > 0) {
            let serverList = `⚠️ **WARNING: User Has Active Servers**\n\n`;
            serverList += `User **${userInfo.username}** owns ${userServers.length} server(s):\n\n`;
            
            userServers.forEach((server, index) => {
                const serverAttrs = server.attributes;
                serverList += `${index + 1}. **${serverAttrs.name}**\n`;
                serverList += `   🆔 ${serverAttrs.id}\n`;
                serverList += `   💾 ${serverAttrs.limits.memory}MB RAM\n`;
                serverList += `   ──────────────\n`;
            });
            
            serverList += `\n**Deleting this user will also delete ALL their servers!**\n\n`;
            serverList += `Do you want to proceed?\n`;
            serverList += `Type \`DELETE WITH SERVERS\` to delete user and all servers.\n`;
            serverList += `Type \`cancel\` to abort.`;

            await bot.editMessageText(
                serverList,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id,
                    parse_mode: 'Markdown'
                }
            );
            
            session.userServers = userServers;
            session.step = 'confirming_deletion';
            deletionSessions.set(chatId, session);
        } else {
            // No servers, proceed to confirmation
            await showDeletionConfirmation(bot, chatId, session, processingMsg.message_id);
        }
    }

    async function handleServerCheck(bot, chatId, session, userInput) {
        // This step is handled in handleUserSelection
        // Keeping for structure consistency
    }

    async function showDeletionConfirmation(bot, chatId, session, messageId) {
        const userInfo = session.selectedUser.attributes;
        const hasServers = session.userServers?.length > 0;
        
        let confirmationMsg = `⚠️ **CONFIRM USER DELETION**\n\n`;
        
        if (userInfo.root_admin) {
            confirmationMsg += `🚨 **HIGH ALERT: ROOT ADMIN USER** 🚨\n\n`;
        }
        
        confirmationMsg += `👤 **User:** ${userInfo.username}\n`;
        confirmationMsg += `📧 **Email:** ${userInfo.email}\n`;
        confirmationMsg += `🆔 **ID:** ${userInfo.id}\n`;
        confirmationMsg += `👑 **Role:** ${userInfo.root_admin ? 'Administrator ⚠️' : 'Regular User'}\n`;
        confirmationMsg += `📅 **Created:** ${new Date(userInfo.created_at).toLocaleString()}\n`;
        
        if (hasServers) {
            confirmationMsg += `🖥️ **Servers to delete:** ${session.userServers.length}\n`;
        }
        
        confirmationMsg += `\n❌ **This action is permanent and cannot be undone!**\n`;
        confirmationMsg += `User account and ${hasServers ? 'ALL their servers' : 'profile'} will be deleted.\n\n`;
        
        const confirmationText = hasServers ? `DELETE WITH SERVERS` : `DELETE ${userInfo.username}`;
        confirmationMsg += `**Type:** \`${confirmationText}\`\n`;
        confirmationMsg += `**Or type:** \`cancel\` to abort.`;

        await bot.editMessageText(
            confirmationMsg,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            }
        );
        
        session.step = 'confirming_deletion';
        deletionSessions.set(chatId, session);
    }

    async function handleDeletionConfirmation(bot, chatId, session, userInput) {
        const userInfo = session.selectedUser.attributes;
        const hasServers = session.userServers?.length > 0;

        if (userInput.toLowerCase() === 'cancel') {
            bot.sendMessage(chatId, `❌ Deletion of "${userInfo.username}" cancelled.`);
            deletionSessions.delete(chatId);
            return;
        }

        // Check confirmation text
        const expectedConfirmation = hasServers ? 'DELETE WITH SERVERS' : `DELETE ${userInfo.username}`;
        if (userInput !== expectedConfirmation) {
            return bot.sendMessage(
                chatId,
                `⚠️ **Confirmation required!**\n\nTo delete "${userInfo.username}", type:\n\`${expectedConfirmation}\`\n\nOr type \`cancel\` to abort.`,
                { parse_mode: 'Markdown' }
            );
        }

        // Proceed with deletion
        const processingMsg = await bot.sendMessage(
            chatId,
            `🗑️ *Deleting user "${userInfo.username}"${hasServers ? ' and their servers' : ''}...*`,
            { parse_mode: 'Markdown' }
        );

        try {
            // Delete user (this will also delete their servers via Pterodactyl cascade)
            const delRes = await fetch(PANEL_DOMAIN + `/api/application/users/${userInfo.id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + PANEL_API_KEY
                }
            });

            if (delRes.status === 204) {
                let successMsg = `✅ **User Deleted Successfully**\n\n`;
                successMsg += `👤 **Name:** ${userInfo.username}\n`;
                successMsg += `📧 **Email:** ${userInfo.email}\n`;
                successMsg += `🆔 **ID:** ${userInfo.id}\n`;
                successMsg += `👑 **Role:** ${userInfo.root_admin ? 'Administrator' : 'Regular User'}\n`;
                
                if (hasServers) {
                    successMsg += `🖥️ **Deleted Servers:** ${session.userServers.length}\n`;
                }
                
                successMsg += `⏰ **Deleted:** ${new Date().toLocaleString()}\n\n`;
                successMsg += `⚠️ *User account${hasServers ? ' and all associated servers' : ''} have been permanently removed.*`;

                await bot.editMessageText(
                    successMsg,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
                
                // Clear cache for this chat
                dataCache.delete(chatId);
            } else {
                const errData = await delRes.json();
                let errorMsg = '❌ **Failed to delete user**\n\n';
                
                if (errData.errors) {
                    const error = errData.errors[0];
                    if (error.code === "DisplayException") {
                        errorMsg += `Cannot delete this user.\n\n`;
                        errorMsg += `**Reason:** ${error.detail || 'User may have active servers or system restrictions.'}\n`;
                        errorMsg += `You may need to delete their servers first.`;
                    } else {
                        errorMsg += `Error: ${error.detail || JSON.stringify(error)}`;
                    }
                } else {
                    errorMsg += `API returned status ${delRes.status}`;
                }
                
                await bot.editMessageText(
                    errorMsg,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
            }
        } catch (err) {
            await bot.editMessageText(
                `❌ **Deletion Failed**\n\nError: ${err.message}\n\nPlease try again or check panel connectivity.`,
                {
                    chat_id: chatId,
                    message_id: processingMsg.message_id,
                    parse_mode: 'Markdown'
                }
            );
        } finally {
            deletionSessions.delete(chatId);
        }
    }

    // Keep original command for quick deletion
    bot.onText(/\/deluser_quick (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;

        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to delete users.');
        }

        const usernameOrId = match[1].trim();
        
        try {
            const processingMsg = await bot.sendMessage(
                chatId,
                `🔍 *Looking for user "${usernameOrId}"...*`,
                { parse_mode: 'Markdown' }
            );

            // Fetch and find the user
            const users = await fetchUsers();
            const user = users.find(u => 
                u.attributes.id == usernameOrId || 
                u.attributes.username === usernameOrId
            );

            if (!user) {
                await bot.editMessageText(
                    `❌ *User not found*\n\n"${usernameOrId}" does not exist in the panel.`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
                return;
            }

            // Quick deletion
            const delRes = await fetch(PANEL_DOMAIN + `/api/application/users/${user.attributes.id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + PANEL_API_KEY
                }
            });

            if (delRes.status === 204) {
                await bot.editMessageText(
                    `✅ **Quick Deletion Complete**\n\nUser "${user.attributes.username}" (ID: ${user.attributes.id}) deleted.`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
            } else {
                const errData = await delRes.json();
                await bot.editMessageText(
                    `❌ **Deletion Failed**\n\nError: ${JSON.stringify(errData)}`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
            }
        } catch (err) {
            bot.sendMessage(chatId, '❌ Error: ' + err.message);
        }
    });
};