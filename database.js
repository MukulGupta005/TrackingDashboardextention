const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize database (create tables if they don't exist)
async function initializeDatabase() {
  console.log('Database initialization complete (using Supabase)');
  await checkSchema();
  console.log('Make sure you have created the tables in Supabase Dashboard');
}

// User operations
const userQueries = {
  async create(email, passwordHash, referralCode) {
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password_hash: passwordHash, referral_code: referralCode }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  async findByReferralCode(referralCode) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('referral_code', referralCode)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
};

// Extension operations
const extensionQueries = {
  async create(userId, name, storeUrl, platform) {
    const { data, error } = await supabase
      .from('extensions')
      .insert([{
        user_id: userId,
        name,
        store_url: storeUrl,
        platform
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByUserId(userId) {
    const { data, error } = await supabase
      .from('extensions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('extensions')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('extensions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};

// Feature flags for schema adaptation
let hasExtensionIdColumn = false;

// Check schema capabilities on startup
async function checkSchema() {
  const { error } = await supabase
    .from('installations')
    .select('extension_id')
    .limit(1);

  if (!error) {
    hasExtensionIdColumn = true;
    console.log('Schema Check: extension_id column detected.');
  } else {
    console.warn('Schema Check: extension_id column MISSING. Running in compatibility mode.');
  }
}

// Installation operations
const installationQueries = {
  async create({ referralCode, userId, installId, extensionId = null, deviceFingerprint = null }) {
    // Dynamically build insert object based on schema capabilities
    const insertData = {
      referral_code: referralCode,
      user_id: userId,
      install_id: installId,
      device_fingerprint: deviceFingerprint
    };

    // Only add extension_id if the column exists
    if (hasExtensionIdColumn && extensionId) {
      insertData.extension_id = extensionId;
    }

    const { data, error } = await supabase
      .from('installations')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMellowtelOptIn(installId, optedIn = true) {
    const { data, error } = await supabase
      .from('installations')
      .update({ mellowtel_opted_in: optedIn })
      .eq('install_id', installId)
      .select();

    if (error) throw error;
    return data;
  },

  async markInstallationAsUninstalled(installId) {
    const { data, error } = await supabase
      .from('installations')
      .update({
        status: 'uninstalled',
        uninstalled_at: new Date().toISOString(),
        mellowtel_opted_in: false
      })
      .eq('install_id', installId)
      .select();

    if (error) throw error;
    return data;
  },

  async updateLastActive(installId) {
    const { data, error } = await supabase
      .from('installations')
      .update({ last_active: new Date().toISOString() })
      .eq('install_id', installId)
      .select();

    if (error) throw error;
    return data;
  },

  async countByReferral(referralCode) {
    const { count, error } = await supabase
      .from('installations')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code', referralCode);

    if (error) throw error;
    return { count };
  },

  async countMellowtelByReferral(referralCode) {
    const { count, error } = await supabase
      .from('installations')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code', referralCode)
      .eq('mellowtel_opted_in', true);

    if (error) throw error;
    return { count };
  },

  async countActiveByReferral(referralCode) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('installations')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code', referralCode)
      .gte('last_active', twentyFourHoursAgo)
      .in('status', ['active', null]); // Only count active or null status

    if (error) throw error;
    return { count };
  },

  async countInactiveByReferral(referralCode) {
    const { count, error } = await supabase
      .from('installations')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code', referralCode)
      .eq('status', 'inactive');

    if (error) throw error;
    return { count };
  },

  async countUninstalledByReferral(referralCode) {
    const { count, error } = await supabase
      .from('installations')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code', referralCode)
      .eq('status', 'uninstalled');

    if (error) throw error;
    return { count };
  },

  async getRecentByReferral(referralCode, limit) {
    const { data, error } = await supabase
      .from('installations')
      .select('*')
      .eq('referral_code', referralCode)
      .order('installed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async findByInstallId(installId) {
    const { data, error } = await supabase
      .from('installations')
      .select('*')
      .eq('install_id', installId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
};

// Stats operations
async function getStatsByReferral(referralCode) {
  const totalInstallsResult = await installationQueries.countByReferral(referralCode);
  const mellowtelOptInsResult = await installationQueries.countMellowtelByReferral(referralCode);
  const activeUsersResult = await installationQueries.countActiveByReferral(referralCode);
  const inactiveResult = await installationQueries.countInactiveByReferral(referralCode);
  const uninstalledResult = await installationQueries.countUninstalledByReferral(referralCode);
  const recentInstalls = await installationQueries.getRecentByReferral(referralCode, 10);

  // Enrich installations with last session timestamps
  const enrichedInstalls = await Promise.all(
    (recentInstalls || []).map(async (install) => {
      const { data: lastSession } = await supabase
        .from('activity_sessions')
        .select('start_time, last_heartbeat')
        .eq('install_id', install.install_id)
        .order('last_heartbeat', { ascending: false })
        .limit(1)
        .single();

      return {
        ...install,
        last_active_start: lastSession?.start_time || null,
        last_active_stop: lastSession?.last_heartbeat || null
      };
    })
  );

  return {
    totalInstalls: totalInstallsResult.count || 0,
    mellowtelOptIns: mellowtelOptInsResult.count || 0,
    activeUsers: activeUsersResult.count || 0,
    inactiveInstalls: inactiveResult.count || 0,
    uninstalledInstalls: uninstalledResult.count || 0,
    recentInstalls: enrichedInstalls
  };
}

// Get stats by extension
async function getStatsByExtension(extensionId) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get counts
  const { count: totalInstalls } = await supabase
    .from('installations')
    .select('*', { count: 'exact', head: true })
    .eq('extension_id', extensionId);

  const { count: mellowtelOptIns } = await supabase
    .from('installations')
    .select('*', { count: 'exact', head: true })
    .eq('extension_id', extensionId)
    .eq('mellowtel_opted_in', true);

  const { count: activeUsers } = await supabase
    .from('installations')
    .select('*', { count: 'exact', head: true })
    .eq('extension_id', extensionId)
    .gte('last_active', twentyFourHoursAgo);

  // Get recent installations
  const { data: recentInstalls } = await supabase
    .from('installations')
    .select('*')
    .eq('extension_id', extensionId)
    .order('installed_at', { ascending: false })
    .limit(10);

  return {
    totalInstalls: totalInstalls || 0,
    mellowtelOptIns: mellowtelOptIns || 0,
    activeUsers: activeUsers || 0,
    recentInstalls: recentInstalls || []
  };
}

module.exports = {
  supabase,
  initializeDatabase,
  userQueries,
  extensionQueries,
  installationQueries,
  getStatsByReferral,
  getStatsByExtension
};
