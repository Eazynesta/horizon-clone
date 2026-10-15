'use strict';

function publicConfig(env = process.env) {
  const url = (env.SUPABASE_URL || '').trim();
  const key = (env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  // Fail closed if a server-only secret is accidentally assigned to this variable.
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key) || key.includes('REPLACE_ME')) return null;
  return { supabaseUrl: url.replace(/\/$/, ''), supabasePublishableKey: key };
}

function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET'); res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  const config = publicConfig();
  res.statusCode = config ? 200 : 503;
  res.end(JSON.stringify(config || { error: 'Account services are not configured yet. Please try again later.' }));
}
module.exports = handler;
module.exports.publicConfig = publicConfig;
