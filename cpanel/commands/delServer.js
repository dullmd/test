const fetch = require('node-fetch');
const { PANEL_DOMAIN, PANEL_API_KEY } = require('../config');

module.exports = function delServerCommand(bot, AUTHORIZED_ADMINS) {
    // Store deletion sessions
    const deletionSessions = new Map();
    
    // Store fetched servers cache
    const serverCache = new Map();
    const CACHE_DURATION = 30000; // 30 seconds

    // Start deletion flow
    bot.onText(/\/delserver/, async (msg) => {
        const chatId = msg.chat.id;

        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to delete servers.');
        }

        try {
            // Send loading message
            const loadingMsg = await bot.sendMessage(
                chatId,
                '📡 *Fetching server list...*',
                { parse_mode: 'Markdown' }
            );

            // Fetch servers
            const servers = await fetchServers();
            if (!servers || servers.length === 0) {
                await bot.editMessageText(
                    '❌ *No servers found* in the panel.',
                    {
                        chat_id: chatId,
                        message_id: loadingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
                return;
            }

            // Store servers in cache
            serverCache.set(chatId, {
                servers: servers,
                timestamp: Date.now()
            });

            // Create server list message
            let serverList = '📋 *Select a Server to Delete*\n\n';
            servers.forEach((server, index) => {
                const serverInfo = server.attributes;
                const owner = serverInfo.relationships?.user?.attributes?.username || 'Unknown';
                serverList += `${index + 1}. **${serverInfo.name}**\n`;
                serverList += `   🆔 ID: ${serverInfo.id}\n`;
                serverList += `   👤 Owner: ${owner}\n`;
                serverList += `   📅 Created: ${new Date(serverInfo.created_at).toLocaleDateString()}\n`;
                serverList += `   ──────────────\n`;
            });

            serverList += '\n*Reply with the **server number** or **server ID** to select:*';

            await bot.editMessageText(
                serverList,
                {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: 'Markdown'
                }
            );

            // Initialize deletion session
            deletionSessions.set(chatId, {
                step: 'selecting_server',
                servers: servers
            });

        } catch (err) {
            bot.sendMessage(
                chatId,
                `❌ *Failed to fetch servers*\n\nError: ${err.message}`,
                { parse_mode: 'Markdown' }
            );
        }
    });

    // Cancel command
    bot.onText(/\/cancel_delete/, async (msg) => {
        const chatId = msg.chat.id;
        if (deletionSessions.has(chatId)) {
            deletionSessions.delete(chatId);
            bot.sendMessage(chatId, '❌ Server deletion cancelled.');
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
                case 'selecting_server':
                    await handleServerSelection(bot, chatId, session, userInput);
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

    async function fetchServers() {
        try {
            const res = await fetch(PANEL_DOMAIN + '/api/application/servers', {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + PANEL_API_KEY  // FIXED: No syntax error here
                }
            });

            const data = await res.json();
            if (data.errors) throw new Error(JSON.stringify(data.errors[0]));
            
            return data.data || [];
        } catch (err) {
            console.error('Error fetching servers:', err);
            throw err;
        }
    }

    async function handleServerSelection(bot, chatId, session, userInput) {
        const servers = session.servers;
        let selectedServer = null;

        // Try to find by number (1, 2, 3...)
        const serverNumber = parseInt(userInput);
        if (!isNaN(serverNumber) && serverNumber >= 1 && serverNumber <= servers.length) {
            selectedServer = servers[serverNumber - 1];
        } else {
            // Try to find by ID or name
            selectedServer = servers.find(s => 
                s.attributes.id.toString() === userInput || 
                s.attributes.name.toLowerCase().includes(userInput.toLowerCase())
            );
        }

        if (!selectedServer) {
            return bot.sendMessage(
                chatId,
                `❌ *Server not found*\n\n"${userInput}" does not match any server.\n\nPlease enter a valid server number, ID, or name:`
            );
        }

        const serverInfo = selectedServer.attributes;
        const owner = selectedServer.relationships?.user?.attributes?.username || 'Unknown';

        // Store selected server in session
        session.selectedServer = selectedServer;
        session.step = 'confirming_deletion';
        deletionSessions.set(chatId, session);

        // Show confirmation message
        const confirmationMsg = `
⚠️ **CONFIRM SERVER DELETION**

🖥️ **Server:** ${serverInfo.name}
🆔 **ID:** ${serverInfo.id}
👤 **Owner:** ${owner}
📊 **Memory:** ${serverInfo.limits.memory} MB
⚡ **CPU:** ${serverInfo.limits.cpu}%
💿 **Disk:** ${serverInfo.limits.disk} MB
📅 **Created:** ${new Date(serverInfo.created_at).toLocaleString()}

❌ **This action is permanent and cannot be undone!**
All server data, files, and configurations will be lost.

**Are you absolutely sure you want to delete this server?**

Type \`DELETE ${serverInfo.name}\` to confirm deletion.
Type \`cancel\` to abort.
`;

        bot.sendMessage(chatId, confirmationMsg, { parse_mode: 'Markdown' });
    }

    async function handleDeletionConfirmation(bot, chatId, session, userInput) {
        const serverInfo = session.selectedServer.attributes;

        if (userInput.toLowerCase() === 'cancel') {
            bot.sendMessage(chatId, `❌ Deletion of "${serverInfo.name}" cancelled.`);
            deletionSessions.delete(chatId);
            return;
        }

        // Require explicit confirmation with server name
        const expectedConfirmation = `DELETE ${serverInfo.name}`;
        if (userInput !== expectedConfirmation) {
            return bot.sendMessage(
                chatId,
                `⚠️ **Confirmation required!**\n\nTo delete "${serverInfo.name}", type:\n\`${expectedConfirmation}\`\n\nOr type \`cancel\` to abort.`,
                { parse_mode: 'Markdown' }
            );
        }

        // Proceed with deletion
        const processingMsg = await bot.sendMessage(
            chatId,
            `🗑️ *Deleting server "${serverInfo.name}"...*`,
            { parse_mode: 'Markdown' }
        );

        try {
            // Delete server
            const delRes = await fetch(PANEL_DOMAIN + `/api/application/servers/${serverInfo.id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + PANEL_API_KEY
                }
            });

            if (delRes.status === 204) {
                await bot.editMessageText(
                    `✅ **Server Deleted Successfully**\n\n` +
                    `🖥️ **Name:** ${serverInfo.name}\n` +
                    `🆔 **ID:** ${serverInfo.id}\n` +
                    `👤 **Owner:** ${session.selectedServer.relationships?.user?.attributes?.username || 'Unknown'}\n` +
                    `⏰ **Deleted:** ${new Date().toLocaleString()}\n\n` +
                    `⚠️ *All server data has been permanently removed.*`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
                
                // Clear cache for this chat
                serverCache.delete(chatId);
            } else {
                const errData = await delRes.json();
                let errorMsg = '❌ **Failed to delete server**\n\n';
                
                if (errData.errors) {
                    errorMsg += `Error: ${errData.errors[0]?.detail || JSON.stringify(errData.errors[0])}`;
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

    // Also keep the original command for quick deletion by ID
    bot.onText(/\/delserver_quick (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;

        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized to delete servers.');
        }

        const serverIdOrName = match[1].trim();
        
        try {
            const processingMsg = await bot.sendMessage(
                chatId,
                `🔍 *Looking for server "${serverIdOrName}"...*`,
                { parse_mode: 'Markdown' }
            );

            // Fetch and find the server
            const servers = await fetchServers();
            const server = servers.find(s => 
                s.attributes.id == serverIdOrName || 
                s.attributes.name === serverIdOrName
            );

            if (!server) {
                await bot.editMessageText(
                    `❌ *Server not found*\n\n"${serverIdOrName}" does not exist in the panel.`,
                    {
                        chat_id: chatId,
                        message_id: processingMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
                return;
            }

            // Quick deletion with minimal confirmation
            const delRes = await fetch(PANEL_DOMAIN + `/api/application/servers/${server.attributes.id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + PANEL_API_KEY
                }
            });

            if (delRes.status === 204) {
                await bot.editMessageText(
                    `✅ **Quick Deletion Complete**\n\nServer "${server.attributes.name}" (ID: ${server.attributes.id}) deleted.`,
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