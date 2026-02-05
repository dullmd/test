module.exports = function menuCommand(bot) {
    // Main menu with interactive buttons
    bot.onText(/\/menu/, (msg) => {
        const chatId = msg.chat.id;
        
        // Create interactive keyboard
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🚀 Create Server', callback_data: 'menu_create_server' },
                    { text: '👥 User Management', callback_data: 'menu_user_mgmt' }
                ],
                [
                    { text: '🖥️ Server Management', callback_data: 'menu_server_mgmt' },
                    { text: '⚙️ System Tools', callback_data: 'menu_system_tools' }
                ],
                [
                    { text: '📊 Statistics', callback_data: 'menu_stats' },
                    { text: '📚 Help Guide', callback_data: 'menu_help' }
                ],
                [
                    { text: '🏢 About Us', callback_data: 'menu_about' },
                    { text: '📞 Contact', callback_data: 'menu_contact' }
                ],
                [
                    { text: '🌐 Visit Website', url: 'https://api.xcasper.site' },
                    { text: '💳 Billing Portal', url: 'https://api.xcasper.site/payments' }
                ]
            ]
        };

        const menuText = 
`<b>🚀 XCASPER HOSTING BOT</b>

<i>We believe in growing and building together</i>
<i>POWERED BY CASPER TECH</i>

<b>👑 Owner:</b> @casper_tech_ke
<b>🌐 Website:</b> api.xcasper.site

<b>📊 Quick Stats:</b>
• All commands are interactive
• Step-by-step guidance
• Safety confirmations
• Automatic cleanup system

👇 <b>Select a category below:</b>`;

        const imageUrl = 'https://files.catbox.moe/xo6h36.jpg';

        // Send image with inline keyboard
        bot.sendPhoto(chatId, imageUrl, {
            caption: menuText,
            parse_mode: 'HTML',
            reply_markup: keyboard
        });
    });

    // Handle callback queries for interactive menu
    bot.on('callback_query', async (callbackQuery) => {
        const msg = callbackQuery.message;
        const chatId = msg.chat.id;
        const data = callbackQuery.data;
        const messageId = msg.message_id;

        try {
            switch(data) {
                case 'menu_create_server':
                    await bot.editMessageCaption(
                        `<b>📜 SERVER CREATION</b>\n\n` +
                        `<b>Available Commands:</b>\n\n` +
                        `• <code>/1gb</code> - Create 1GB RAM server\n` +
                        `• <code>/2gb</code> - Create 2GB RAM server\n` +
                        `• <code>/3gb</code> - Create 3GB RAM server\n` +
                        `• <code>/4gb</code> - Create 4GB RAM server\n` +
                        `• <code>/5gb</code> - Create 5GB RAM server\n` +
                        `• <code>/6gb</code> - Create 6GB RAM server\n` +
                        `• <code>/7gb</code> - Create 7GB RAM server\n` +
                        `• <code>/8gb</code> - Create 8GB RAM server\n` +
                        `• <code>/9gb</code> - Create 9GB RAM server\n` +
                        `• <code>/10gb</code> - Create 10GB RAM server\n` +
                        `• <code>/unli</code> - Create unlimited server\n\n` +
                        `<b>Features:</b>\n` +
                        `✅ Interactive step-by-step\n` +
                        `✅ Email/username validation\n` +
                        `✅ Duplicate checking\n` +
                        `✅ Auto-generated passwords\n` +
                        `✅ Credentials sent via Telegram\n\n` +
                        `<b>How to use:</b>\n` +
                        `1. Type command (e.g. <code>/1gb</code>)\n` +
                        `2. Follow the prompts\n` +
                        `3. Confirm details\n` +
                        `4. Get credentials\n\n` +
                        `<b>Example:</b> <code>/1gb</code>`,
                        {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }],
                                    [{ text: '🚀 Try Now - /1gb', callback_data: 'try_create' }]
                                ]
                            }
                        }
                    );
                    break;
                    
                case 'menu_user_mgmt':
                    await bot.editMessageCaption(
                        `<b>👥 USER MANAGEMENT</b>\n\n` +
                        `<b>Available Commands:</b>\n\n` +
                        `• <code>/createuser</code> - Create panel user\n` +
                        `• <code>/deluser</code> - Delete user\n` +
                        `• <code>/listusers</code> - List all users\n` +
                        `• <code>/listpaneladmins</code> - List admins\n\n` +
                        `<b>Create User (/createuser):</b>\n` +
                        `✅ Interactive flow\n` +
                        `✅ Username validation\n` +
                        `✅ Email validation\n` +
                        `✅ Auto-generated password\n` +
                        `✅ Confirmation step\n\n` +
                        `<b>Delete User (/deluser):</b>\n` +
                        `⚠️ Safety checks\n` +
                        `⚠️ Server ownership verification\n` +
                        `⚠️ Explicit confirmation required\n` +
                        `⚠️ Cannot be undone\n\n` +
                        `<b>Quick Commands (Use with caution):</b>\n` +
                        `• <code>/createuser_quick</code>\n` +
                        `• <code>/deluser_quick</code>\n\n` +
                        `<b>Example:</b> <code>/createuser</code>`,
                        {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }],
                                    [{ text: '➕ Create User - /createuser', callback_data: 'create_user_now' }]
                                ]
                            }
                        }
                    );
                    break;
                    
                case 'menu_server_mgmt':
                    await bot.editMessageCaption(
                        `<b>🖥️ SERVER MANAGEMENT</b>\n\n` +
                        `<b>Available Commands:</b>\n\n` +
                        `• <code>/addserver</code> - Add server to user\n` +
                        `• <code>/delserver</code> - Delete server\n` +
                        `• <code>/listservers</code> - List all servers\n\n` +
                        `<b>Add Server (/addserver):</b>\n` +
                        `✅ Interactive selection\n` +
                        `✅ RAM type choice (1gb-10gb/unli)\n` +
                        `✅ Existing user assignment\n` +
                        `✅ Server name input\n` +
                        `✅ Confirmation step\n\n` +
                        `<b>Delete Server (/delserver):</b>\n` +
                        `⚠️ Server list display\n` +
                        `⚠️ Full details shown\n` +
                        `⚠️ Type "DELETE servername" to confirm\n` +
                        `⚠️ Permanent action\n\n` +
                        `<b>Quick Commands (Use with caution):</b>\n` +
                        `• <code>/delserver_quick</code>\n\n` +
                        `<b>Example:</b> <code>/addserver</code>`,
                        {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }],
                                    [{ text: '➕ Add Server - /addserver', callback_data: 'add_server_now' }]
                                ]
                            }
                        }
                    );
                    break;
                    
                case 'menu_system_tools':
                    await bot.editMessageCaption(
                        `<b>⚙️ SYSTEM TOOLS & MAINTENANCE</b>\n\n` +
                        `<b>Available Commands:</b>\n\n` +
                        `• <code>/cleanup</code> - Run server cleanup\n` +
                        `• <code>/cleanup_status</code> - Check status\n` +
                        `• <code>/cleanup_setdays</code> - Set days threshold\n` +
                        `• <code>/stats</code> - View creation statistics\n` +
                        `• <code>/status</code> - Full system status\n` +
                        `• <code>/ping</code> - Quick connectivity test\n` +
                        `• <code>/mini_status</code> - Quick overview\n\n` +
                        `<b>Auto-Cleanup Features:</b>\n` +
                        `🔧 Automatically deletes old servers\n` +
                        `📅 Default: 30 days threshold\n` +
                        `⏰ Runs every 24 hours\n` +
                        `📊 Sends notification reports\n` +
                        `🎛️ Manual control available\n\n` +
                        `<b>Database Tracking:</b>\n` +
                        `📝 All creations logged\n` +
                        `📈 View with /stats command\n` +
                        `📊 Usage analytics\n` +
                        `💾 Saved to database.json\n\n` +
                        `<b>Example:</b> <code>/status</code>`,
                        {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }],
                                    [{ text: '📊 Check Status - /status', callback_data: 'check_status' }]
                                ]
                            }
                        }
                    );
                    break;
                    
                case 'menu_stats':
                    await bot.editMessageCaption(
                        `<b>📊 STATISTICS & ANALYTICS</b>\n\n` +
                        `<b>Available Commands:</b>\n\n` +
                        `• <code>/stats</code> - View creation statistics\n` +
                        `• <code>/status</code> - Full system report\n` +
                        `• <code>/mini_status</code> - Quick overview\n` +
                        `• <code>/ping</code> - Connectivity test\n\n` +
                        `<b>What you can track:</b>\n` +
                        `📈 Total creations count\n` +
                        `📅 Today's creations\n` +
                        `🔢 Statistics by server type\n` +
                        `👥 User/server counts\n` +
                        `⏰ System uptime\n` +
                        `📡 Panel connectivity\n` +
                        `💾 Resource usage\n\n` +
                        `<b>Database Features:</b>\n` +
                        `💿 All data saved to database.json\n` +
                        `📝 Record ID for each creation\n` +
                        `📅 Timestamp and date tracking\n` +
                        `👤 Admin who performed action\n` +
                        `🖥️ Server specifications logged\n\n` +
                        `<b>Example:</b> <code>/stats</code>`,
                        {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }],
                                    [{ text: '📈 View Stats - /stats', callback_data: 'view_stats' }]
                                ]
                            }
                        }
                    );
                    break;
                    
                case 'menu_help':
                    await bot.editMessageCaption(
                        `<b>📚 HELP & SUPPORT</b>\n\n` +
                        `<b>Quick Help Commands:</b>\n\n` +
                        `• <code>/help</code> - Detailed help guide\n` +
                        `• <code>/menu</code> - This interactive menu\n` +
                        `• <code>/info</code> - Company information\n` +
                        `• <code>/start</code> - Welcome message\n\n` +
                        `<b>Cancel Commands:</b>\n` +
                        `• <code>/cancel</code> - General cancel\n` +
                        `• <code>/cancel_admin</code> - Cancel admin creation\n` +
                        `• <code>/cancel_user</code> - Cancel user creation\n` +
                        `• <code>/cancel_delete</code> - Cancel deletion\n` +
                        `• <code>/cancel_userdelete</code> - Cancel user delete\n\n` +
                        `<b>Best Practices:</b>\n` +
                        `1️⃣ Always verify before deleting\n` +
                        `2️⃣ Use interactive commands\n` +
                        `3️⃣ Share credentials securely\n` +
                        `4️⃣ Change default passwords\n` +
                        `5️⃣ Monitor with /stats regularly\n\n` +
                        `<b>Troubleshooting:</b>\n` +
                        `🔍 "User exists" - Try different username\n` +
                        `🔍 "Server not found" - Check spelling\n` +
                        `🔍 "Not authorized" - Contact support\n` +
                        `🔍 Connection errors - Check panel\n\n` +
                        `<b>Example:</b> <code>/help</code>`,
                        {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }],
                                    [{ text: '📖 Full Help - /help', callback_data: 'full_help' }]
                                ]
                            }
                        }
                    );
                    break;
                    
                case 'menu_about':
                    await bot.editMessageCaption(
                        `<b>🏢 ABOUT XCASPER HOSTING</b>\n\n` +
                        `<b>Company:</b> XCASPER HOSTING\n` +
                        `<b>Motto:</b> We believe in growing and building together\n` +
                        `<b>Powered by:</b> CASPER TECH\n` +
                        `<b>Status:</b> ✅ Operational\n\n` +
                        `<b>Leadership:</b>\n` +
                        `👑 <b>Owner:</b> @casper_tech_ke\n` +
                        `👨‍💻 <b>Support:</b> @casper_tech_ke\n\n` +
                        `<b>Services Offered:</b>\n` +
                        `🎮 Game Server Hosting\n` +
                        `🌐 Web Application Hosting\n` +
                        `🤖 Bot Hosting Services\n` +
                        `🔧 Custom Server Solutions\n` +
                        `📞 24/7 Telegram Support\n\n` +
                        `<b>Bot Features:</b>\n` +
                        `✅ Interactive server management\n` +
                        `✅ Automated cleanup system\n` +
                        `✅ User administration tools\n` +
                        `✅ Real-time notifications\n` +
                        `✅ Secure credential handling\n\n` +
                        `<b>Example:</b> <code>/info</code>`,
                        {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }],
                                    [{ text: '🏢 More Info - /info', callback_data: 'more_info' }]
                                ]
                            }
                        }
                    );
                    break;
                    
                case 'menu_contact':
                    await bot.editMessageCaption(
                        `<b>📞 CONTACT & SUPPORT</b>\n\n` +
                        `<b>Primary Contact:</b>\n` +
                        `👑 @casper_tech_ke\n\n` +
                        `<b>Web Services:</b>\n` +
                        `🌐 <b>Website:</b> api.xcasper.site\n` +
                        `📞 <b>Contact Form:</b> api.xcasper.site/contact\n` +
                        `💳 <b>Billing Portal:</b> api.xcasper.site/payments\n\n` +
                        `<b>Support Hours:</b>\n` +
                        `🕒 24/7 via Telegram\n` +
                        `⏰ East Africa Time (EAT)\n\n` +
                        `<b>Response Time:</b>\n` +
                        `✅ Usually within minutes\n` +
                        `📱 Telegram preferred\n` +
                        `📧 Email via website form\n\n` +
                        `<b>For Support, Include:</b>\n` +
                        `1. Your Telegram ID\n` +
                        `2. Command you were using\n` +
                        `3. Error message (if any)\n` +
                        `4. Screenshot if possible\n\n` +
                        `<i>Thank you for choosing XCASPER HOSTING!</i>`,
                        {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }],
                                    [
                                        { text: '🌐 Visit Website', url: 'https://api.xcasper.site' },
                                        { text: '📞 Contact Form', url: 'https://api.xcasper.site/contact' }
                                    ]
                                ]
                            }
                        }
                    );
                    break;
                    
                case 'back_to_menu':
                    // Restore original menu
                    const keyboard = {
                        inline_keyboard: [
                            [
                                { text: '🚀 Create Server', callback_data: 'menu_create_server' },
                                { text: '👥 User Management', callback_data: 'menu_user_mgmt' }
                            ],
                            [
                                { text: '🖥️ Server Management', callback_data: 'menu_server_mgmt' },
                                { text: '⚙️ System Tools', callback_data: 'menu_system_tools' }
                            ],
                            [
                                { text: '📊 Statistics', callback_data: 'menu_stats' },
                                { text: '📚 Help Guide', callback_data: 'menu_help' }
                            ],
                            [
                                { text: '🏢 About Us', callback_data: 'menu_about' },
                                { text: '📞 Contact', callback_data: 'menu_contact' }
                            ],
                            [
                                { text: '🌐 Visit Website', url: 'https://api.xcasper.site' },
                                { text: '💳 Billing Portal', url: 'https://api.xcasper.site/payments' }
                            ]
                        ]
                    };

                    await bot.editMessageCaption(
                        `<b>🚀 XCASPER HOSTING BOT</b>\n\n` +
                        `<i>We believe in growing and building together</i>\n` +
                        `<i>POWERED BY CASPER TECH</i>\n\n` +
                        `<b>👑 Owner:</b> @casper_tech_ke\n` +
                        `<b>🌐 Website:</b> api.xcasper.site\n\n` +
                        `<b>📊 Quick Stats:</b>\n` +
                        `• All commands are interactive\n` +
                        `• Step-by-step guidance\n` +
                        `• Safety confirmations\n` +
                        `• Automatic cleanup system\n\n` +
                        `👇 <b>Select a category below:</b>`,
                        {
                            chat_id: chatId,
                            message_id: messageId,
                            parse_mode: 'HTML',
                            reply_markup: keyboard
                        }
                    );
                    break;
                    
                // Action buttons
                case 'try_create':
                    bot.sendMessage(chatId, "<b>🚀 Starting server creation...</b>\n\nType: <code>/1gb</code> to begin", { parse_mode: 'HTML' });
                    break;
                    
                case 'create_user_now':
                    bot.sendMessage(chatId, "<b>👥 Starting user creation...</b>\n\nType: <code>/createuser</code> to begin", { parse_mode: 'HTML' });
                    break;
                    
                case 'add_server_now':
                    bot.sendMessage(chatId, "<b>🖥️ Starting server addition...</b>\n\nType: <code>/addserver</code> to begin", { parse_mode: 'HTML' });
                    break;
                    
                case 'check_status':
                    bot.sendMessage(chatId, "<b>⚙️ Checking system status...</b>\n\nType: <code>/status</code> to begin", { parse_mode: 'HTML' });
                    break;
                    
                case 'view_stats':
                    bot.sendMessage(chatId, "<b>📊 Fetching statistics...</b>\n\nType: <code>/stats</code> to begin", { parse_mode: 'HTML' });
                    break;
                    
                case 'full_help':
                    bot.sendMessage(chatId, "<b>📚 Loading help guide...</b>\n\nType: <code>/help</code> to begin", { parse_mode: 'HTML' });
                    break;
                    
                case 'more_info':
                    bot.sendMessage(chatId, "<b>🏢 Loading company info...</b>\n\nType: <code>/info</code> to begin", { parse_mode: 'HTML' });
                    break;
            }
            
            // Answer callback query to remove loading state
            await bot.answerCallbackQuery(callbackQuery.id);
            
        } catch (err) {
            console.error('Menu callback error:', err.message);
            try {
                await bot.answerCallbackQuery(callbackQuery.id, { text: 'Error loading content', show_alert: true });
            } catch (e) {
                // Ignore if already answered
            }
        }
    });

    // Help command with HTML
    bot.onText(/\/help/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 
            `<b>📚 Need detailed help?</b>\n\n` +
            `For full documentation, use the interactive menu with <code>/menu</code>\n\n` +
            `<b>Quick Commands:</b>\n` +
            `<code>/menu</code> - Interactive menu with buttons\n` +
            `<code>/info</code> - Company information\n` +
            `<code>/start</code> - Welcome message\n\n` +
            `<b>Contact Support:</b>\n` +
            `👑 @casper_tech_ke\n` +
            `🌐 api.xcasper.site/contact\n\n` +
            `<i>The menu (<code>/menu</code>) provides the best interactive experience!</i>`,
            { parse_mode: 'HTML' }
        );
    });

    // Start command with HTML
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const startText = 
`<b>✨ Welcome to XCASPER HOSTING Bot! ✨</b>

<i>We believe in growing and building together</i>
<i>POWERED BY CASPER TECH</i>

<b>🚀 Your Complete Hosting Management Solution</b>

This bot helps you manage your XCASPER hosting panel through Telegram. You can:

• 🖥️ Create and manage servers
• 👥 Handle user accounts
• ⚙️ Perform administrative tasks
• 🧹 Automatic maintenance

<b>📋 Quick Start:</b>
Type <code>/menu</code> to see the interactive menu with all commands!

<b>🔗 Important Links:</b>
🌐 <b>Website:</b> api.xcasper.site
📞 <b>Contact:</b> api.xcasper.site/contact
💳 <b>Billing:</b> api.xcasper.site/payments

<b>👑 Owner:</b> @casper_tech_ke

<i>Start by typing <code>/menu</code> to explore available commands!</i>`;

        const imageUrl = 'https://files.catbox.moe/xo6h36.jpg';

        bot.sendPhoto(chatId, imageUrl, { 
            caption: startText, 
            parse_mode: 'HTML'
        });
    });

    // Info command with HTML
    bot.onText(/\/info/, (msg) => {
        const chatId = msg.chat.id;
        const infoText = 
`<b>🏢 XCASPER HOSTING INFORMATION</b>

<b>Company:</b> XCASPER HOSTING
<b>Motto:</b> We believe in growing and building together
<b>Powered by:</b> CASPER TECH
<b>Status:</b> ✅ Operational

<b>👑 Leadership:</b>
• <b>Owner:</b> @casper_tech_ke
• <b>Support:</b> @casper_tech_ke

<b>🌐 Web Services:</b>
• <b>Main Website:</b> api.xcasper.site
• <b>Contact Form:</b> api.xcasper.site/contact
• <b>Payment Portal:</b> api.xcasper.site/payments
• <b>API Documentation:</b> Available on request

<b>🛠️ Services Offered:</b>
• Game Server Hosting
• Web Application Hosting
• Bot Hosting Services
• Custom Server Solutions
• 24/7 Support (via Telegram)

<b>💡 Bot Features:</b>
• Interactive server management
• Automated cleanup system
• User administration tools
• Real-time notifications
• Secure credential handling

<b>📞 Contact Information:</b>
<b>Primary:</b> @casper_tech_ke
<b>Email:</b> Via website contact form
<b>Support:</b> 24/7 Telegram support

<i>Thank you for trusting XCASPER HOSTING with your hosting needs!</i>`;

        bot.sendMessage(chatId, infoText, { parse_mode: 'HTML' });
    });
};