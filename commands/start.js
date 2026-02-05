const fetch = require('node-fetch');
const os = require('os');
const { execSync } = require('child_process');
const { PANEL_DOMAIN, PANEL_API_KEY } = require('../config');

module.exports = function statusMenuCommand(bot) {
    // Status command with HTML formatting
    bot.onText(/\/status/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            // Start timing for ping calculation
            const startTime = Date.now();

            // Fetch panel status
            let panelStatus = '🔴 Offline';
            let numUsers = 0;
            let numServers = 0;
            let numAdmins = 0;
            let panelPing = 0;

            try {
                // Test panel connection
                const panelTestStart = Date.now();
                const usersRes = await fetch(PANEL_DOMAIN + '/api/application/users', {
                    method: 'GET',
                    headers: { 
                        Accept: 'application/json', 
                        Authorization: 'Bearer ' + PANEL_API_KEY 
                    }
                });
                
                panelPing = Date.now() - panelTestStart;
                
                if (usersRes.ok) {
                    panelStatus = `🟢 Online (${panelPing}ms)`;
                    const usersData = await usersRes.json();
                    numUsers = usersData.data ? usersData.data.length : 0;
                    
                    // Count admins
                    numAdmins = usersData.data ? usersData.data.filter(u => u.attributes.root_admin).length : 0;
                }
                
                // Fetch servers
                const serversRes = await fetch(PANEL_DOMAIN + '/api/application/servers', {
                    method: 'GET',
                    headers: { 
                        Accept: 'application/json', 
                        Authorization: 'Bearer ' + PANEL_API_KEY 
                    }
                });
                
                if (serversRes.ok) {
                    const serversData = await serversRes.json();
                    numServers = serversData.data ? serversData.data.length : 0;
                }
                
            } catch (panelErr) {
                panelStatus = '🔴 Connection Failed';
            }

            // Bot Uptime
            const uptimeSeconds = process.uptime();
            const days = Math.floor(uptimeSeconds / (3600 * 24));
            const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = Math.floor(uptimeSeconds % 60);
            const uptime = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`;

            // Build status message with HTML
            let statusMessage = `<b>🚀 XCASPER HOSTING STATUS REPORT</b>\n`;
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n\n`;
            
            statusMessage += `<b>Motto:</b> We believe in growing and building together\n`;
            statusMessage += `<b>Powered by:</b> CASPER TECH\n`;
            statusMessage += `<b>Owner:</b> @casper_tech_ke\n`;
            statusMessage += `<b>Website:</b> api.xcasper.site\n\n`;
            
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `<b>🤖 BOT INFORMATION</b>\n`;
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `• <b>Bot Name:</b> XCASPER Hosting Bot\n`;
            statusMessage += `• <b>Bot Uptime:</b> ${uptime}\n`;
            statusMessage += `• <b>Panel Status:</b> ${panelStatus}\n`;
            statusMessage += `• <b>Bot Ping:</b> ${Date.now() - startTime}ms\n`;
            statusMessage += `• <b>Your Telegram ID:</b> ${msg.from.id}\n`;
            statusMessage += `• <b>Bot Version:</b> 2.0 (Interactive)\n\n`;
            
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `<b>📊 PANEL STATISTICS</b>\n`;
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `• <b>Total Users:</b> ${numUsers}\n`;
            statusMessage += `• <b>Total Servers:</b> ${numServers}\n`;
            statusMessage += `• <b>Admin Users:</b> ${numAdmins}\n`;
            statusMessage += `• <b>Regular Users:</b> ${numUsers - numAdmins}\n`;
            statusMessage += `• <b>Panel URL:</b> ${PANEL_DOMAIN}\n\n`;

            // VPS System Information
            try {
                const cpuModel = os.cpus()[0].model;
                const cpuCores = os.cpus().length;
                const cpuUsage = os.loadavg()[0].toFixed(2);

                const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
                const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
                const usedRam = (totalRam - freeRam).toFixed(2);
                const ramUsagePercent = ((usedRam / totalRam) * 100).toFixed(1);

                // Disk usage
                let diskTotal = 'N/A';
                let diskUsed = 'N/A';
                let diskFree = 'N/A';
                let diskUsagePercent = 'N/A';

                try {
                    const diskOutput = execSync("df -h / | awk 'NR==2 {print $2,$3,$4,$5}'").toString().trim();
                    const diskParts = diskOutput.split(/\s+/);
                    if (diskParts.length >= 4) {
                        diskTotal = diskParts[0];
                        diskUsed = diskParts[1];
                        diskFree = diskParts[2];
                        diskUsagePercent = diskParts[3];
                    }
                } catch (diskErr) {
                    diskTotal = diskUsed = diskFree = diskUsagePercent = 'Unknown';
                }

                const hostname = os.hostname();
                const platform = os.platform().toUpperCase();
                const arch = os.arch().toUpperCase();

                // East African time
                const eatTime = new Date().toLocaleString("en-US", { 
                    timeZone: "Africa/Nairobi",
                    dateStyle: 'medium',
                    timeStyle: 'medium'
                });

                statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
                statusMessage += `<b>🖥️ SYSTEM RESOURCES</b>\n`;
                statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
                statusMessage += `• <b>Hostname:</b> ${hostname}\n`;
                statusMessage += `• <b>OS:</b> ${platform} ${arch}\n`;
                statusMessage += `• <b>CPU Model:</b> ${cpuModel}\n`;
                statusMessage += `• <b>CPU Cores:</b> ${cpuCores}\n`;
                statusMessage += `• <b>CPU Load:</b> ${cpuUsage}\n`;
                statusMessage += `• <b>Total RAM:</b> ${totalRam} GB\n`;
                statusMessage += `• <b>Used RAM:</b> ${usedRam} GB\n`;
                statusMessage += `• <b>Free RAM:</b> ${freeRam} GB\n`;
                statusMessage += `• <b>RAM Usage:</b> ${ramUsagePercent}%\n`;
                statusMessage += `• <b>Total Disk:</b> ${diskTotal}\n`;
                statusMessage += `• <b>Used Disk:</b> ${diskUsed}\n`;
                statusMessage += `• <b>Free Disk:</b> ${diskFree}\n`;
                statusMessage += `• <b>Disk Usage:</b> ${diskUsagePercent}\n`;
                statusMessage += `• <b>System Time (EAT):</b> ${eatTime}\n\n`;
                
            } catch (sysErr) {
                statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
                statusMessage += `<b>🖥️ SYSTEM RESOURCES</b>\n`;
                statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
                statusMessage += `❌ <b>Unable to fetch system information</b>\n`;
                statusMessage += `${sysErr.message}\n\n`;
            }

            // Service Status
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `<b>📈 SERVICE STATUS</b>\n`;
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `• <b>Telegram Bot:</b> 🟢 Operational\n`;
            statusMessage += `• <b>Panel API:</b> ${panelStatus.includes('🟢') ? '🟢 Connected' : '🔴 Disconnected'}\n`;
            statusMessage += `• <b>Auto-Cleanup:</b> 🟢 Active (30 days)\n`;
            statusMessage += `• <b>Database:</b> 🟢 Connected\n`;
            statusMessage += `• <b>Command Queue:</b> 🟢 Ready\n\n`;

            // Quick Actions
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `<b>⚡ QUICK ACTIONS</b>\n`;
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `• <b>/menu</b> - Show all commands\n`;
            statusMessage += `• <b>/stats</b> - View creation statistics\n`;
            statusMessage += `• <b>/cleanup_status</b> - Check cleanup status\n`;
            statusMessage += `• <b>/help</b> - Detailed help guide\n`;
            statusMessage += `• <b>/info</b> - Company information\n\n`;

            // Contact Information
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `<b>📞 CONTACT & SUPPORT</b>\n`;
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `• <b>Owner:</b> @casper_tech_ke\n`;
            statusMessage += `• <b>Contact Form:</b> api.xcasper.site/contact\n`;
            statusMessage += `• <b>Billing:</b> api.xcasper.site/payments\n`;
            statusMessage += `• <b>Support:</b> 24/7 via Telegram\n\n`;
            statusMessage += `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━━</code>\n`;
            statusMessage += `<i>Thank you for choosing XCASPER HOSTING!</i>`;

            // Send the status message
            await bot.sendMessage(chatId, statusMessage, { 
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

        } catch (err) {
            bot.sendMessage(chatId, `<b>❌ Error fetching status:</b>\n${err.message}`, { 
                parse_mode: 'HTML' 
            });
        }
    });

    // Simple status command with HTML
    bot.onText(/\/ping/, async (msg) => {
        const chatId = msg.chat.id;
        const start = Date.now();
        
        try {
            // Test panel connection
            const panelRes = await fetch(PANEL_DOMAIN + '/api/application/users', {
                method: 'GET',
                headers: { 
                    Accept: 'application/json', 
                    Authorization: 'Bearer ' + PANEL_API_KEY 
                }
            });
            
            const panelPing = Date.now() - start;
            
            if (panelRes.ok) {
                bot.sendMessage(
                    chatId,
                    `<b>🏓 PONG!</b>\n\n` +
                    `✅ <b>Panel Connection:</b> ${panelPing}ms\n` +
                    `🤖 <b>Bot Uptime:</b> ${Math.floor(process.uptime() / 60)} minutes\n` +
                    `🔗 <b>Panel Status:</b> 🟢 Online\n\n` +
                    `<i>XCASPER HOSTING - Always Growing Together</i>`,
                    { parse_mode: 'HTML' }
                );
            } else {
                bot.sendMessage(
                    chatId,
                    `<b>⚠️ PANEL CONNECTION ISSUE</b>\n\n` +
                    `<b>Panel Ping:</b> ${panelPing}ms\n` +
                    `<b>Status:</b> ${panelRes.status}\n` +
                    `Please check panel connectivity.`,
                    { parse_mode: 'HTML' }
                );
            }
        } catch (err) {
            const totalPing = Date.now() - start;
            bot.sendMessage(
                chatId,
                `<b>❌ CONNECTION FAILED</b>\n\n` +
                `<b>Timeout:</b> ${totalPing}ms\n` +
                `<b>Error:</b> ${err.message}\n\n` +
                `Please contact @casper_tech_ke`,
                { parse_mode: 'HTML' }
            );
        }
    });

    // Mini status for quick checks with HTML
    bot.onText(/\/mini_status/, async (msg) => {
        const chatId = msg.chat.id;
        
        try {
            const start = Date.now();
            
            // Fetch quick stats
            const [usersRes, serversRes] = await Promise.all([
                fetch(PANEL_DOMAIN + '/api/application/users', {
                    headers: { 
                        Accept: 'application/json', 
                        Authorization: 'Bearer ' + PANEL_API_KEY 
                    }
                }),
                fetch(PANEL_DOMAIN + '/api/application/servers', {
                    headers: { 
                        Accept: 'application/json', 
                        Authorization: 'Bearer ' + PANEL_API_KEY 
                    }
                })
            ]);
            
            const ping = Date.now() - start;
            
            let users = 0;
            let servers = 0;
            
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                users = usersData.data ? usersData.data.length : 0;
            }
            
            if (serversRes.ok) {
                const serversData = await serversRes.json();
                servers = serversData.data ? serversData.data.length : 0;
            }
            
            // Uptime
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            
            const miniStatus = `<b>📊 XCASPER QUICK STATUS</b>\n\n` +
                               `• 🟢 <b>Bot Status:</b> Online\n` +
                               `• 📡 <b>Panel Ping:</b> ${ping}ms\n` +
                               `• 👥 <b>Users:</b> ${users}\n` +
                               `• 🖥️ <b>Servers:</b> ${servers}\n` +
                               `• ⏰ <b>Uptime:</b> ${hours}h ${minutes}m\n\n` +
                               `<i>Powered by CASPER TECH</i>\n` +
                               `👑 @casper_tech_ke\n` +
                               `🌐 api.xcasper.site`;
            
            bot.sendMessage(chatId, miniStatus, { parse_mode: 'HTML' });
            
        } catch (err) {
            bot.sendMessage(
                chatId,
                `<b>❌ Quick Status Error</b>\n${err.message}`,
                { parse_mode: 'HTML' }
            );
        }
    });
};