const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { PANEL_DOMAIN, PANEL_API_KEY, TELEGRAM_CHAT_ID } = require('../config');

const DATABASE_FILE = path.join(__dirname, '../commands/database.json');

class AutoCleanup {
    constructor(bot, authorizedAdmins) {
        this.bot = bot;
        this.authorizedAdmins = authorizedAdmins || []; // ADD THIS LINE
        this.checkInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.daysThreshold = 30; // Delete servers older than 30 days
        this.isRunning = false;
    }

    // Load database
    loadDatabase() {
        try {
            if (fs.existsSync(DATABASE_FILE)) {
                return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
            }
        } catch (err) {
            console.error('Error loading database:', err);
        }
        return { creations: [] };
    }

    // Save database
    saveDatabase(database) {
        try {
            fs.writeFileSync(DATABASE_FILE, JSON.stringify(database, null, 2), 'utf8');
        } catch (err) {
            console.error('Error saving database:', err);
        }
    }

    // Calculate days difference
    getDaysDifference(dateString) {
        const creationDate = new Date(dateString);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - creationDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Delete server from Pterodactyl panel
    async deleteServerFromPanel(serverId, serverName) {
        try {
            const response = await fetch(`${PANEL_DOMAIN}/api/application/servers/${serverId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PANEL_API_KEY}`
                }
            });

            if (response.ok) {
                console.log(`✅ Deleted server from panel: ${serverName} (ID: ${serverId})`);
                return true;
            } else {
                const error = await response.json();
                console.error(`❌ Failed to delete server ${serverId}:`, error);
                return false;
            }
        } catch (err) {
            console.error(`❌ Error deleting server ${serverId}:`, err.message);
            return false;
        }
    }

    // Delete user from Pterodactyl panel
    async deleteUserFromPanel(userId, username) {
        try {
            const response = await fetch(`${PANEL_DOMAIN}/api/application/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PANEL_API_KEY}`
                }
            });

            if (response.ok) {
                console.log(`✅ Deleted user from panel: ${username} (ID: ${userId})`);
                return true;
            } else {
                const error = await response.json();
                console.error(`❌ Failed to delete user ${userId}:`, error);
                return false;
            }
        } catch (err) {
            console.error(`❌ Error deleting user ${userId}:`, err.message);
            return false;
        }
    }

    // Send notification to Telegram
    async sendNotification(message) {
        try {
            if (this.bot && TELEGRAM_CHAT_ID) {
                await this.bot.sendMessage(TELEGRAM_CHAT_ID, message);
            }
        } catch (err) {
            console.error('❌ Error sending notification:', err.message);
        }
    }

    // Main cleanup function
    async performCleanup() {
        if (this.isRunning) {
            console.log('⚠️ Cleanup already in progress');
            return;
        }

        this.isRunning = true;
        console.log('🔄 Starting automatic cleanup check...');

        try {
            const database = this.loadDatabase();
            const oldServers = [];
            const serversToKeep = [];
            const usersToDelete = new Set();

            // Find servers older than 30 days
            for (const creation of database.creations) {
                const daysOld = this.getDaysDifference(creation.timestamp);
                
                if (daysOld > this.daysThreshold) {
                    oldServers.push({
                        creationId: creation.id,
                        serverId: creation.server.serverId,
                        serverName: creation.server.name,
                        userId: creation.user.panelUserId,
                        username: creation.user.username,
                        email: creation.user.email,
                        daysOld: daysOld,
                        creationDate: creation.timestamp
                    });
                    
                    // Mark user for deletion (we'll check if they have other servers)
                    usersToDelete.add({
                        userId: creation.user.panelUserId,
                        username: creation.user.username
                    });
                } else {
                    serversToKeep.push(creation.id);
                }
            }

            if (oldServers.length === 0) {
                console.log('✅ No servers older than 30 days found.');
                await this.sendNotification('✅ Automatic cleanup: No servers older than 30 days found.');
                this.isRunning = false;
                return;
            }

            console.log(`📊 Found ${oldServers.length} servers older than 30 days`);
            await this.sendNotification(`🔄 Starting automatic cleanup:\nFound ${oldServers.length} servers older than 30 days`);

            let deletedServers = 0;
            let deletedUsers = 0;
            let failedDeletions = 0;

            // Delete old servers
            for (const server of oldServers) {
                console.log(`🗑️ Processing server: ${server.serverName} (${server.daysOld} days old)`);
                
                // Delete server from panel
                const serverDeleted = await this.deleteServerFromPanel(server.serverId, server.serverName);
                
                if (serverDeleted) {
                    deletedServers++;
                    
                    // Check if user has other active servers
                    const userHasOtherServers = database.creations.some(c => 
                        c.user.panelUserId === server.userId && 
                        c.id !== server.creationId &&
                        this.getDaysDifference(c.timestamp) <= this.daysThreshold
                    );
                    
                    // Only delete user if they have no other active servers
                    if (!userHasOtherServers) {
                        const userDeleted = await this.deleteUserFromPanel(server.userId, server.username);
                        if (userDeleted) {
                            deletedUsers++;
                        } else {
                            console.log(`⚠️ Keeping user ${server.username} (failed to delete or has other servers)`);
                        }
                    } else {
                        console.log(`⚠️ Keeping user ${server.username} (has other active servers)`);
                    }
                    
                    // Remove from database
                    database.creations = database.creations.filter(c => c.id !== server.creationId);
                    database.servers = database.servers.filter(s => s.creationId !== server.creationId);
                    database.users = database.users.filter(u => {
                        if (u.panelUserId === server.userId) {
                            // Check if this user has other creations
                            const hasOtherCreations = database.creations.some(c => 
                                c.user.panelUserId === server.userId
                            );
                            return hasOtherCreations; // Keep if user has other creations
                        }
                        return true;
                    });
                    
                } else {
                    failedDeletions++;
                    console.log(`❌ Failed to delete server: ${server.serverName}`);
                }
            }

            // Save updated database
            this.saveDatabase(database);

            // Send summary notification
            const summary = `✅ Automatic cleanup completed!\n\n` +
                          `📊 Statistics:\n` +
                          `• Total old servers found: ${oldServers.length}\n` +
                          `• Successfully deleted: ${deletedServers}\n` +
                          `• Users deleted: ${deletedUsers}\n` +
                          `• Failed deletions: ${failedDeletions}\n` +
                          `• Remaining in database: ${database.creations.length}`;

            console.log(summary);
            await this.sendNotification(summary);

        } catch (err) {
            console.error('❌ Error during cleanup:', err);
            await this.sendNotification(`❌ Automatic cleanup failed: ${err.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    // Manual cleanup trigger
    async manualCleanup(chatId) {
        // FIXED: Use this.authorizedAdmins instead of AUTHORIZED_ADMINS
        if (!this.authorizedAdmins.includes(chatId)) {
            await this.bot.sendMessage(chatId, '❌ You are not authorized to run manual cleanup.');
            return;
        }

        await this.bot.sendMessage(chatId, '🔄 Starting manual cleanup process...');
        await this.performCleanup();
    }

    // Schedule automatic cleanup
    startScheduledCleanup() {
        console.log(`⏰ Scheduled cleanup started. Will run every 24 hours.`);
        
        // Run immediately on start
        setTimeout(() => this.performCleanup(), 5000);
        
        // Then run every 24 hours
        setInterval(() => this.performCleanup(), this.checkInterval);
    }

    // Get cleanup status
    getStatus() {
        const database = this.loadDatabase();
        const totalServers = database.creations.length;
        const oldServers = database.creations.filter(c => 
            this.getDaysDifference(c.timestamp) > this.daysThreshold
        ).length;
        
        return {
            isRunning: this.isRunning,
            totalServers: totalServers,
            oldServers: oldServers,
            daysThreshold: this.daysThreshold,
            nextCheck: new Date(Date.now() + this.checkInterval).toLocaleString()
        };
    }
}

module.exports = AutoCleanup;