// Utility script to mark inactive installations
// Run this periodically (e.g., via cron job or manual execution)

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function markInactiveInstallations() {
    try {
        console.log('Checking for inactive installations...');

        // Mark installations as inactive if no heartbeat in last 48 hours
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const { data: updated, error } = await supabase
            .from('installations')
            .update({ status: 'inactive' })
            .lt('last_active', fortyEightHoursAgo)
            .eq('status', 'active');

        if (error) {
            console.error('Error marking inactive installations:', error);
            return;
        }

        console.log(`✅ Marked installations as inactive`);

        // Get summary
        const { data: stats, error: statsError } = await supabase
            .from('installations')
            .select('status');

        if (!statsError && stats) {
            const summary = stats.reduce((acc, inst) => {
                acc[inst.status] = (acc[inst.status] || 0) + 1;
                return acc;
            }, {});

            console.log('\nInstallation Status Summary:');
            console.log(`  Active: ${summary.active || 0}`);
            console.log(`  Inactive: ${summary.inactive || 0}`);
            console.log(`  Uninstalled: ${summary.uninstalled || 0}`);
        }

    } catch (error) {
        console.error('Error in markInactiveInstallations:', error);
    }
}

// Run if called directly
if (require.main === module) {
    markInactiveInstallations()
        .then(() => {
            console.log('\n✅ Done!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { markInactiveInstallations };
