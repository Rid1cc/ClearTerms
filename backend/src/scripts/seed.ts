import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { createHash } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function hashUrl(url: string) {
  return createHash('sha256').update(url).digest('hex');
}

async function main() {
  console.log('🌱 Starting full database seed (Corporate Mode)...\n');

  // ---------- 1. CLEANUP ----------
  console.log('🧹 Cleaning up old mock data...');
  const { data: users } = await supabase.auth.admin.listUsers();
  for (const u of users.users) {
    if (u.email?.includes('@company.com') || u.email?.includes('@example.com')) {
      await supabase.auth.admin.deleteUser(u.id);
    }
  }
  await supabase.from('scanned_sites').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // ---------- 2. USERS ----------
  console.log('👤 Creating users...');
  
  const createUsr = async (email: string, name: string) => {
    const res = await supabase.auth.admin.createUser({
      email,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { display_name: name }
    });
    if (res.error) throw res.error;
    await supabase.from('user_profiles').upsert({
      id: res.data.user.id,
      display_name: name,
      preferences: { notifications: true, language: 'en' }
    });
    return res.data.user.id;
  };

  const ceoId = await createUsr('ceo@company.com', 'Alice (CEO)');
  const adminId = await createUsr('admin@company.com', 'Bob (IT Admin)');
  const devId = await createUsr('dev@company.com', 'Charlie (Developer)');
  const salesId = await createUsr('sales@company.com', 'Dave (Sales)');

  // ---------- 3. GROUPS & MEMBERS ----------
  console.log('🏢 Creating corporate departments...');
  
  const { data: mainGroup } = await supabase.from('groups').insert({
    name: 'Acme Corp - Global',
    description: 'Main corporate security group',
    created_by: ceoId,
    invite_code: 'acme-global-001'
  }).select('*').single();

  const { data: itGroup } = await supabase.from('groups').insert({
    name: 'Acme Corp - IT Dept',
    description: 'IT and Development Team',
    created_by: adminId,
    invite_code: 'acme-it-002'
  }).select('*').single();

  await supabase.from('group_members').insert([
    { group_id: mainGroup!.id, user_id: ceoId, role: 'admin' },
    { group_id: mainGroup!.id, user_id: adminId, role: 'admin' },
    { group_id: mainGroup!.id, user_id: devId, role: 'member' },
    { group_id: mainGroup!.id, user_id: salesId, role: 'member' },
    { group_id: itGroup!.id, user_id: adminId, role: 'admin' },
    { group_id: itGroup!.id, user_id: devId, role: 'member' },
  ]);

  // ---------- 4. COMPANIES ----------
  console.log('🏢 Creating external companies...');
  const { data: metaCorp } = await supabase.from('companies').insert({
    name: 'Sociable Media Inc',
    headquarters_country: 'US',
    website: 'https://sociable.example.com',
    description: 'A large advertising and social media conglomerate.'
  }).select('id').single();

  const { data: shadyCorp } = await supabase.from('companies').insert({
    name: 'Shady Analytics Ltd',
    headquarters_country: 'RU',
    website: 'http://shady-track.com',
    description: 'An aggressive data broker with numerous violations.'
  }).select('id').single();

  await supabase.from('company_audits').insert([
    { company_id: metaCorp!.id, known_breaches_count: 3, regulatory_fines_count: 5, reliability_score: 65, incidents_timeline: [{ date: '2023-01-10', title: 'Data Scraping Fine', severity: 'high' }] },
    { company_id: shadyCorp!.id, known_breaches_count: 12, regulatory_fines_count: 0, reliability_score: 15, incidents_timeline: [{ date: '2024-05-12', title: 'Malware Distribution', severity: 'critical' }] }
  ]);

  // ---------- 5. SITES & VERDICTS ----------
  console.log('🌐 Creating sites...');

  const sites = [
    { url: 'https://admin-portal-secure.com', domain: 'admin-portal-secure.com', comp: null },
    { url: 'https://social-network.com', domain: 'social-network.com', comp: metaCorp!.id },
    { url: 'http://free-movies-hd-now.ru', domain: 'free-movies-hd-now.ru', comp: shadyCorp!.id },
    { url: 'https://company-login-update-urgent.com', domain: 'company-login-update-urgent.com', comp: null },
  ];

  const insertedSites = [];
  for (const s of sites) {
    const { data } = await supabase.from('scanned_sites').insert({
      url: s.url, domain: s.domain, url_hash: hashUrl(s.url), company_id: s.comp, scan_count: Math.floor(Math.random() * 100), last_analyzed_at: new Date().toISOString()
    }).select('*').single();
    insertedSites.push(data);
  }

  console.log('⚖️ Creating verdicts...');
  const verdicts = [
    { site_id: insertedSites[0]!.id, verdict: 'safe', score: 95, summary: 'Internal portal, no external trackers.', red_flags: [], data_processing_countries: ['US'] },
    { site_id: insertedSites[1]!.id, verdict: 'suspicious', score: 55, summary: 'Social media, high tracking footprint.', red_flags: ['Extensive tracking cookies'], data_processing_countries: ['US'] },
    { site_id: insertedSites[2]!.id, verdict: 'suspicious', score: 25, summary: 'Aggressive tracking, malware distribution potential.', red_flags: ['Known malware distributor'], data_processing_countries: ['RU'] },
    { site_id: insertedSites[3]!.id, verdict: 'phishing', score: 5, summary: 'Targeted spear phishing attempting to steal corporate credentials.', red_flags: ['Domain age < 7 days', 'Deceptive URL structure', 'Requests AD credentials'], data_processing_countries: [] }
  ];
  
  for (const v of verdicts) {
    await supabase.from('site_verdicts').insert({ ...v, is_current: true });
  }

  // ---------- 6. SCAN HISTORY ----------
  console.log('📖 Generating scan history...');
  const { data: vRecord } = await supabase.from('site_verdicts').select('id').eq('site_id', insertedSites[1]!.id).single();
  
  await supabase.from('scan_history').insert([
    { user_id: adminId, site_id: insertedSites[0]!.id, scanned_at: new Date(Date.now() - 86400000).toISOString() },
    { user_id: salesId, site_id: insertedSites[1]!.id, verdict_id: vRecord!.id, scanned_at: new Date(Date.now() - 3600000).toISOString() },
    { user_id: devId, site_id: insertedSites[3]!.id, scanned_at: new Date(Date.now() - 1800000).toISOString() },
  ]);

  // ---------- 7. ALERTS ----------
  console.log('🚨 Generating corporate alerts...');
  
  // Note: we reuse the "parental_alerts" table as a supervisor/admin alert table
  await supabase.from('parental_alerts').insert([
    { group_id: mainGroup!.id, child_user_id: devId, site_id: insertedSites[2]!.id, site_url: insertedSites[2]!.url, event_type: 'suspicious_site_visited', details: { score: 25, reason: 'Malware distributor blocked' } },
    { group_id: mainGroup!.id, child_user_id: salesId, site_id: insertedSites[3]!.id, site_url: insertedSites[3]!.url, event_type: 'visit_blocked', details: { reason: 'Phishing domain match' } }
  ]);

  const { data: subData } = await supabase.from('submitted_data_log').insert({
    user_id: salesId, site_id: insertedSites[3]!.id, site_url: insertedSites[3]!.url, data_categories: ['email', 'password']
  }).select('id').single();

  await supabase.from('leak_alerts').insert({
    user_id: salesId, submitted_data_log_id: subData!.id, site_id: insertedSites[3]!.id, site_url: insertedSites[3]!.url, data_categories: ['email', 'password'], severity: 'critical', message: 'Employee submitted corporate credentials to a phishing domain!'
  });

  console.log('\n🎉 ALL DONE! The corporate database is seeded.');
  console.log('Users -> ceo@company.com, admin@company.com, dev@company.com, sales@company.com (pass: Password123!)');
}

main().catch(console.error);