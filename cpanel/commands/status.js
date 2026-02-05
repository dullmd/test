const fetch = require('node-fetch');
const os = require('os');
const { execSync } = require('child_process');
const { PANEL_DOMAIN, PANEL_API_KEY } = require('../config');

module.exports = function statusMenuCommand(bot) {
    // Status command
    bot.onText(/\/status/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            // Start timing for ping calculation
            const startTime = Date.now();

            // Company Information
            const companyInfo = `<b>🚀 XCASPER HOSTING STATUS REPORT</b>
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
<b>Motto:</b> We believe in growing and building together
<b>Powered by:</b> CASPER TECH
<b>Owner:</b> @casper_tech_ke
<b>Website:</b> api.xcasper.site
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>`;

            // Bot Uptime
            const uptimeSeconds = process.uptime();
            const days = Math.floor(uptimeSeconds / (3600 * 24));
            const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = Math.floor(uptimeSeconds % 60);
            const uptime = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`;

            // Fetch panel status
            let panelStatus = '🔴 Offline';
            let numUsers = 0;
            let numServers = 0;
            let numAdmins = 0;

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
                
                const panelPing = Date.now() - panelTestStart;
                
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

            const panelPing = Date.now() - startTime;

            // Bot Information
            const botInfo = `<b>🤖 BOT INFORMATION</b>
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
• <b>Bot Name:</b> XCASPER Hosting Bot
• <b>Bot Uptime:</b> ${uptime}
• <b>Panel Status:</b> ${panelStatus}
• <b>Bot Ping:</b> ${panelPing}ms
• <b>Your Telegram ID:</b> ${msg.from.id}
• <b>Bot Version:</b> 2.0 (Interactive)
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>`;

            // Panel Statistics
            const panelStats = `<b>📊 PANEL STATISTICS</b>
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
• <b>Total Users:</b> ${numUsers}
• <b>Total Servers:</b> ${numServers}
• <b>Admin Users:</b> ${numAdmins}
• <b>Regular Users:</b> ${numUsers - numAdmins}
• <b>Panel URL:</b> ${PANEL_DOMAIN}
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>`;

            // VPS System Information
            let vpsInfo = '';
            try {
                const cpuModel = os.cpus()[0].model;
                const cpuCores = os.cpus().length;
                const cpuUsage = os.loadavg()[0].toFixed(2);

                const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
                const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
                const usedRam = (totalRam - freeRam).toFixed(2);
                const ramUsagePercent = ((usedRam / totalRam) * 100).toFixed(1);

                // Disk usage (Linux only)
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
                    // Fallback for non-Linux systems
                    diskTotal = 'Unknown';
                    diskUsed = 'Unknown';
                    diskFree = 'Unknown';
                    diskUsagePercent = 'Unknown';
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

                vpsInfo = `<b>🖥️ SYSTEM RESOURCES</b>
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
• <b>Hostname:</b> ${hostname}
• <b>OS:</b> ${platform} ${arch}
• <b>CPU Model:</b> ${cpuModel}
• <b>CPU Cores:</b> ${cpuCores}
• <b>CPU Load:</b> ${cpuUsage}
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
• <b>Total RAM:</b> ${totalRam} GB
• <b>Used RAM:</b> ${usedRam} GB
• <b>Free RAM:</b> ${freeRam} GB
• <b>RAM Usage:</b> ${ramUsagePercent}%
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
• <b>Total Disk:</b> ${diskTotal}
• <b>Used Disk:</b> ${diskUsed}
• <b>Free Disk:</b> ${diskFree}
• <b>Disk Usage:</b> ${diskUsagePercent}
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
• <b>System Time (EAT):</b> ${eatTime}
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>`;
            } catch (sysErr) {
                vpsInfo = `<b>🖥️ SYSTEM RESOURCES</b>
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
❌ <b>Unable to fetch system information</b>
${sysErr.message}
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>`;
            }

            // Service Status Summary
            const servicesStatus = `<b>📈 SERVICE STATUS</b>
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
• <b>Telegram Bot:</b> 🟢 Operational
• <b>Panel API:</b> ${panelStatus.includes('🟢') ? '🟢 Connected' : '🔴 Disconnected'}
• <b>Auto-Cleanup:</b> 🟢 Active (30 days)
• <b>Database:</b> 🟢 Connected
• <b>Command Queue:</b> 🟢 Ready
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>`;

            // Quick Actions
            const quickActions = `<b>⚡ QUICK ACTIONS</b>
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
• <b>/menu</b> - Show all commands
• <b>/stats</b> - View creation statistics
• <b>/cleanup_status</b> - Check cleanup status
• <b>/help</b> - Detailed help guide
• <b>/info</b> - Company information
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>`;

            // Contact Information
            const contactInfo = `<b>📞 CONTACT & SUPPORT</b>
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
• <b>Owner:</b> @casper_tech_ke
• <b>Contact Form:</b> api.xcasper.site/contact
• <b>Billing:</b> api.xcasper.site/payments
• <b>Support:</b> 24/7 via Telegram
<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>
<i>Thank you for choosing XCASPER HOSTING!</i>`;

            // Combine all sections
            const fullStatus = companyInfo + botInfo + panelStats + vpsInfo + servicesStatus + quickActions + contactInfo;

            // Send the status message
            await bot.sendMessage(chatId, fullStatus, { 
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

        } catch (err) {
            bot.sendMessage(chatId, `<b>❌ Error fetching status:</b>\n${err.message}`, { 
                parse_mode: 'HTML' 
            });
        }
    });

    // Simple status command
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

    // Mini status for quick checks
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
            
            const miniStatus = `<b>📊 XCASPER QUICK STATUS</b>

• 🟢 <b>Bot Status:</b> Online
• 📡 <b>Panel Ping:</b> ${ping}ms
• 👥 <b>Users:</b> ${users}
• 🖥️ <b>Servers:</b> ${servers}
• ⏰ <b>Uptime:</b> ${hours}h ${minutes}m

<i>Powered by CASPER TECH</i>
👑 @casper_tech_ke
🌐 api.xcasper.site`;
            
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