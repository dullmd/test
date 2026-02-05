const AutoCleanup = require('../services/autoCleanup');

module.exports = function cleanupCommand(bot, AUTHORIZED_ADMINS) {
    let cleanupService = null;

    // Initialize cleanup service
    bot.on('polling_error', () => {
        // Wait for bot to be ready
        setTimeout(() => {
            if (!cleanupService) {
                cleanupService = new AutoCleanup(bot, AUTHORIZED_ADMINS); // PASS AUTHORIZED_ADMINS
                cleanupService.startScheduledCleanup();
            }
        }, 3000);
    });

    // Manual cleanup command
    bot.onText(/\/cleanup/, async (msg) => {
        const chatId = msg.chat.id;
        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized.');
        }

        if (!cleanupService) {
            cleanupService = new AutoCleanup(bot, AUTHORIZED_ADMINS); // PASS AUTHORIZED_ADMINS
        }

        await cleanupService.manualCleanup(chatId);
    });

    // Cleanup status command
    bot.onText(/\/cleanup_status/, async (msg) => {
        const chatId = msg.chat.id;
        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized.');
        }

        if (!cleanupService) {
            cleanupService = new AutoCleanup(bot, AUTHORIZED_ADMINS); // PASS AUTHORIZED_ADMINS
        }

        const status = cleanupService.getStatus();
        
        let statusMessage = `🔄 *Cleanup Service Status*\n\n`;
        statusMessage += `• **Service Status:** ${status.isRunning ? '🟢 Running' : '🟡 Idle'}\n`;
        statusMessage += `• **Total Servers:** ${status.totalServers}\n`;
        statusMessage += `• **Old Servers (>${status.daysThreshold} days):** ${status.oldServers}\n`;
        statusMessage += `• **Next Auto-check:** ${status.nextCheck}\n\n`;
        statusMessage += `**Commands:**\n`;
        statusMessage += `/cleanup - Run manual cleanup\n`;
        statusMessage += `/cleanup_status - Show this status\n`;
        statusMessage += `/cleanup_setdays X - Set days threshold (currently ${status.daysThreshold})`;

        bot.sendMessage(chatId, statusMessage);
    });

    // Set days threshold command
    bot.onText(/\/cleanup_setdays (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        if (!AUTHORIZED_ADMINS.includes(chatId)) {
            return bot.sendMessage(chatId, '❌ You are not authorized.');
        }

        const days = parseInt(match[1]);
        if (days < 1 || days > 365) {
            return bot.sendMessage(chatId, '❌ Please provide a number between 1 and 365.');
        }

        if (!cleanupService) {
            cleanupService = new AutoCleanup(bot, AUTHORIZED_ADMINS); // PASS AUTHORIZED_ADMINS
        }

        cleanupService.daysThreshold = days;
        await bot.sendMessage(chatId, `✅ Cleanup threshold updated to ${days} days.`);
    });
};