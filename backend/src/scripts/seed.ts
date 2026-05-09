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
  auth: { autoRefreshToken: false, persistSession: false },
});

function hashUrl(url: string) {
  return createHash('sha256').update(url).digest('hex');
}

// Deterministic-ish PRNG so seeds are roughly reproducible across runs.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
const rand = makeRng(424242);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const pickN = <T>(arr: readonly T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
};

// Insert helper with chunking — Supabase chokes on huge single inserts.
async function bulkInsert(
  table: string,
  rows: Array<Record<string, unknown>>,
  chunk = 200
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    // The supabase-js generic is too strict for our generic helper; cast away.
    const { error } = await supabase.from(table).insert(slice as never);
    if (error) throw new Error(`bulkInsert ${table} @ ${i}: ${error.message}`);
  }
}

async function main() {
  console.log('🌱 Starting MEGA database seed (Corporate Mode)…\n');

  // ---------- 1. CLEANUP ----------
  console.log('🧹 Cleaning up old mock data…');
  const { data: existingUsers } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  for (const u of existingUsers?.users ?? []) {
    if (u.email?.includes('@company.com') || u.email?.includes('@example.com')) {
      await supabase.auth.admin.deleteUser(u.id);
    }
  }
  await supabase.from('scanned_sites').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // ---------- 2. USERS (16 total) ----------
  console.log('👤 Creating users (this is the slow part)…');

  type SeedUser = { email: string; name: string };
  const teamSpec: SeedUser[] = [
    { email: 'ceo@company.com', name: 'Alice (CEO)' },
    { email: 'admin@company.com', name: 'Bob (IT Admin)' },
    { email: 'dev@company.com', name: 'Charlie (Developer)' },
    { email: 'sales@company.com', name: 'Dave (Sales)' },
    { email: 'cto@company.com', name: 'Eve (CTO)' },
    { email: 'ops@company.com', name: 'Frank (Ops)' },
    { email: 'finance@company.com', name: 'Grace (Finance)' },
    { email: 'hr@company.com', name: 'Helen (HR)' },
    { email: 'legal@company.com', name: 'Ivan (Legal)' },
    { email: 'support@company.com', name: 'Julia (Support)' },
    { email: 'marketing@company.com', name: 'Kate (Marketing)' },
    { email: 'design@company.com', name: 'Leo (Design)' },
    { email: 'qa@company.com', name: 'Mia (QA)' },
    { email: 'data@company.com', name: 'Nick (Data Eng)' },
    { email: 'product@company.com', name: 'Olivia (Product)' },
    { email: 'security@company.com', name: 'Paul (SecOps)' },
  ];

  const createUsr = async (email: string, name: string) => {
    const res = await supabase.auth.admin.createUser({
      email,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (res.error) throw res.error;
    await supabase.from('user_profiles').upsert({
      id: res.data.user.id,
      display_name: name,
      preferences: { notifications: true, language: 'en' },
    });
    return res.data.user.id;
  };

  const userIds: string[] = [];
  for (const u of teamSpec) {
    userIds.push(await createUsr(u.email, u.name));
  }
  const [
    ceoId,
    adminId,
    devId,
    salesId,
    ctoId,
    opsId,
    financeId,
    hrId,
    /* legalId */,
    /* supportId */,
    /* marketingId */,
    /* designId */,
    /* qaId */,
    /* dataId */,
    /* productId */,
    securityId,
  ] = userIds as [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string];

  // ---------- 3. GROUPS & MEMBERS ----------
  console.log('🏢 Creating departments / groups…');

  const groupDefs = [
    { name: 'Acme Corp - Global', desc: 'Main corporate security group', creator: ceoId, code: 'acme-global-001' },
    { name: 'Acme Corp - IT Dept', desc: 'IT and Development Team', creator: adminId, code: 'acme-it-002' },
    { name: 'Acme Corp - Finance', desc: 'Finance and Accounting', creator: financeId, code: 'acme-fin-003' },
    { name: 'Acme Corp - Sales & Marketing', desc: 'Go-to-market team', creator: salesId, code: 'acme-gtm-004' },
    { name: 'Acme Corp - Engineering', desc: 'Product engineering', creator: ctoId, code: 'acme-eng-005' },
    { name: 'Acme Corp - Security', desc: 'SecOps and incident response', creator: securityId, code: 'acme-sec-006' },
  ];
  const groupIds: string[] = [];
  for (const g of groupDefs) {
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: g.name, description: g.desc, created_by: g.creator, invite_code: g.code })
      .select('id')
      .single();
    if (error) throw error;
    groupIds.push(data!.id);
  }
  const [globalGroupId, itGroupId, financeGroupId, gtmGroupId, engGroupId, secGroupId] =
    groupIds as [string, string, string, string, string, string];

  const memberRows: Array<{ group_id: string; user_id: string; role: string }> = [];
  // Everyone in Global
  for (const uid of userIds) {
    memberRows.push({ group_id: globalGroupId, user_id: uid, role: uid === ceoId || uid === adminId ? 'admin' : 'member' });
  }
  // IT
  for (const uid of [adminId, devId, ctoId, opsId, securityId, userIds[12]!, userIds[13]!]) {
    memberRows.push({ group_id: itGroupId, user_id: uid, role: uid === adminId ? 'admin' : 'member' });
  }
  // Finance
  for (const uid of [financeId, ceoId, hrId]) {
    memberRows.push({ group_id: financeGroupId, user_id: uid, role: uid === financeId ? 'admin' : 'member' });
  }
  // GTM
  for (const uid of [salesId, userIds[10]!, userIds[11]!, userIds[14]!]) {
    memberRows.push({ group_id: gtmGroupId, user_id: uid, role: uid === salesId ? 'admin' : 'member' });
  }
  // Engineering
  for (const uid of [ctoId, devId, userIds[12]!, userIds[13]!, userIds[14]!]) {
    memberRows.push({ group_id: engGroupId, user_id: uid, role: uid === ctoId ? 'admin' : 'member' });
  }
  // Security
  for (const uid of [securityId, adminId, ctoId]) {
    memberRows.push({ group_id: secGroupId, user_id: uid, role: uid === securityId ? 'admin' : 'member' });
  }
  await bulkInsert('group_members', memberRows);

  // ---------- 4. COMPANIES ----------
  console.log('🏭 Creating external companies…');

  const companySpecs = [
    { name: 'Sociable Media Inc', country: 'US', site: 'https://sociable.example.com', desc: 'Large advertising and social media conglomerate.', breaches: 3, fines: 5, score: 65, incidents: [{ date: '2023-01-10', title: 'Data Scraping Fine', severity: 'high' }] },
    { name: 'Shady Analytics Ltd', country: 'RU', site: 'http://shady-track.com', desc: 'Aggressive data broker with numerous violations.', breaches: 12, fines: 0, score: 15, incidents: [{ date: '2024-05-12', title: 'Malware Distribution', severity: 'critical' }] },
    { name: 'CloudWorks SaaS', country: 'IE', site: 'https://cloudworks.example.io', desc: 'EU-based productivity SaaS.', breaches: 1, fines: 0, score: 88, incidents: [] },
    { name: 'Adtech Global', country: 'GB', site: 'https://adtech-global.example', desc: 'Programmatic advertising platform.', breaches: 4, fines: 2, score: 55, incidents: [{ date: '2023-08-22', title: 'GDPR fine', severity: 'medium' }] },
    { name: 'PayStream Ltd', country: 'NL', site: 'https://paystream.example.nl', desc: 'Payments processor.', breaches: 0, fines: 0, score: 92, incidents: [] },
    { name: 'NewsHub Media', country: 'DE', site: 'https://newshub.example.de', desc: 'News aggregator with embedded trackers.', breaches: 2, fines: 1, score: 60, incidents: [{ date: '2024-02-04', title: 'Cookie consent violation', severity: 'medium' }] },
    { name: 'Retail Mega', country: 'US', site: 'https://retail-mega.example', desc: 'E-commerce giant.', breaches: 1, fines: 0, score: 78, incidents: [] },
    { name: 'BankSecure', country: 'CH', site: 'https://banksecure.example.ch', desc: 'Private banking platform.', breaches: 0, fines: 0, score: 96, incidents: [] },
    { name: 'PixelPirate Co', country: 'CN', site: 'https://pixelpirate.example.cn', desc: 'Aggressive ad-fraud network.', breaches: 7, fines: 0, score: 22, incidents: [{ date: '2024-09-18', title: 'Click-fraud takedown', severity: 'high' }] },
    { name: 'HRtech Suite', country: 'FR', site: 'https://hrtech.example.fr', desc: 'HR SaaS, EU residency.', breaches: 0, fines: 0, score: 90, incidents: [] },
    { name: 'GreyMarket Brokers', country: 'PA', site: 'http://greymarket.example.pa', desc: 'Offshore data broker, opaque ownership.', breaches: 5, fines: 0, score: 30, incidents: [{ date: '2024-11-01', title: 'Unverified subprocessors', severity: 'high' }] },
    { name: 'OpenSource Foundation', country: 'US', site: 'https://opensource-fdn.example', desc: 'Non-profit OSS hosting.', breaches: 0, fines: 0, score: 95, incidents: [] },
  ];

  const companyIdByName = new Map<string, string>();
  for (const c of companySpecs) {
    const { data, error } = await supabase
      .from('companies')
      .insert({ name: c.name, headquarters_country: c.country, website: c.site, description: c.desc })
      .select('id')
      .single();
    if (error) throw error;
    companyIdByName.set(c.name, data!.id);
  }

  const auditRows = companySpecs.map((c) => ({
    company_id: companyIdByName.get(c.name)!,
    known_breaches_count: c.breaches,
    regulatory_fines_count: c.fines,
    reliability_score: c.score,
    incidents_timeline: c.incidents,
  }));
  await bulkInsert('company_audits', auditRows);

  // ---------- 5. SITES & VERDICTS ----------
  console.log('🌐 Creating sites + verdicts (50 sites)…');

  type SeedSite = {
    url: string;
    domain: string;
    company: string | null;
    verdict: 'safe' | 'suspicious' | 'phishing' | 'unknown';
    score: number;
    summary: string;
    red_flags: string[];
    countries: string[];
  };

  const sites: SeedSite[] = [
    // ---- SAFE (18) ----
    { url: 'https://admin-portal-secure.com', domain: 'admin-portal-secure.com', company: null, verdict: 'safe', score: 95, summary: 'Internal portal, no external trackers.', red_flags: [], countries: ['US', 'DE'] },
    { url: 'https://internal-wiki.acme.example', domain: 'internal-wiki.acme.example', company: null, verdict: 'safe', score: 92, summary: 'Internal documentation, encrypted, no third-party.', red_flags: [], countries: ['DE'] },
    { url: 'https://payroll.acme.example', domain: 'payroll.acme.example', company: 'HRtech Suite', verdict: 'safe', score: 88, summary: 'Vendor SaaS, EU data residency, SOC2 compliant.', red_flags: [], countries: ['IE', 'NL'] },
    { url: 'https://docs.acme.example', domain: 'docs.acme.example', company: null, verdict: 'safe', score: 94, summary: 'Internal docs portal.', red_flags: [], countries: ['DE'] },
    { url: 'https://gitlab.acme.example', domain: 'gitlab.acme.example', company: null, verdict: 'safe', score: 91, summary: 'Self-hosted source control.', red_flags: [], countries: ['DE'] },
    { url: 'https://cloudworks.example.io', domain: 'cloudworks.example.io', company: 'CloudWorks SaaS', verdict: 'safe', score: 89, summary: 'EU productivity suite.', red_flags: [], countries: ['IE'] },
    { url: 'https://banksecure.example.ch', domain: 'banksecure.example.ch', company: 'BankSecure', verdict: 'safe', score: 97, summary: 'Encrypted private banking.', red_flags: [], countries: ['CH'] },
    { url: 'https://paystream.example.nl', domain: 'paystream.example.nl', company: 'PayStream Ltd', verdict: 'safe', score: 93, summary: 'PCI-DSS compliant payments.', red_flags: [], countries: ['NL'] },
    { url: 'https://hrtech.example.fr', domain: 'hrtech.example.fr', company: 'HRtech Suite', verdict: 'safe', score: 90, summary: 'GDPR-aligned HR platform.', red_flags: [], countries: ['FR'] },
    { url: 'https://opensource-fdn.example', domain: 'opensource-fdn.example', company: 'OpenSource Foundation', verdict: 'safe', score: 96, summary: 'Open-source project hosting.', red_flags: [], countries: ['US'] },
    { url: 'https://stage.acme.example', domain: 'stage.acme.example', company: null, verdict: 'safe', score: 87, summary: 'Internal staging environment.', red_flags: [], countries: ['DE'] },
    { url: 'https://api.acme.example', domain: 'api.acme.example', company: null, verdict: 'safe', score: 95, summary: 'Public API gateway.', red_flags: [], countries: ['US', 'DE'] },
    { url: 'https://status.acme.example', domain: 'status.acme.example', company: null, verdict: 'safe', score: 96, summary: 'Status page.', red_flags: [], countries: ['US'] },
    { url: 'https://mail.acme.example', domain: 'mail.acme.example', company: null, verdict: 'safe', score: 92, summary: 'Corporate webmail (encrypted).', red_flags: [], countries: ['DE'] },
    { url: 'https://retail-mega.example', domain: 'retail-mega.example', company: 'Retail Mega', verdict: 'safe', score: 80, summary: 'Major e-commerce, audited cookies.', red_flags: ['Some marketing cookies'], countries: ['US'] },
    { url: 'https://learning.acme.example', domain: 'learning.acme.example', company: null, verdict: 'safe', score: 90, summary: 'Internal LMS.', red_flags: [], countries: ['DE'] },
    { url: 'https://travel-portal.example.eu', domain: 'travel-portal.example.eu', company: null, verdict: 'safe', score: 84, summary: 'Travel booking SaaS, EU residency.', red_flags: [], countries: ['DE', 'FR'] },
    { url: 'https://print-service.example', domain: 'print-service.example', company: null, verdict: 'safe', score: 86, summary: 'Office printing portal.', red_flags: [], countries: ['DE'] },

    // ---- SUSPICIOUS (15) ----
    { url: 'https://social-network.com', domain: 'social-network.com', company: 'Sociable Media Inc', verdict: 'suspicious', score: 55, summary: 'Social media, high tracking footprint.', red_flags: ['Extensive tracking cookies', 'Cross-site trackers'], countries: ['US', 'IE'] },
    { url: 'https://ad-tracker.example.net', domain: 'ad-tracker.example.net', company: 'Adtech Global', verdict: 'suspicious', score: 42, summary: 'Ad network with broad data sharing.', red_flags: ['Shares data with 200+ partners'], countries: ['US', 'GB'] },
    { url: 'http://free-movies-hd-now.ru', domain: 'free-movies-hd-now.ru', company: 'Shady Analytics Ltd', verdict: 'suspicious', score: 25, summary: 'Aggressive tracking, malware distribution potential.', red_flags: ['Known malware distributor', 'Crypto miners detected'], countries: ['RU', 'CN'] },
    { url: 'https://shady-shopping.example.cn', domain: 'shady-shopping.example.cn', company: 'PixelPirate Co', verdict: 'suspicious', score: 30, summary: 'E-commerce with poor data handling.', red_flags: ['No HTTPS on checkout', 'Stores plaintext passwords'], countries: ['CN', 'RU'] },
    { url: 'https://pixelpirate.example.cn', domain: 'pixelpirate.example.cn', company: 'PixelPirate Co', verdict: 'suspicious', score: 22, summary: 'Click-fraud network.', red_flags: ['Click fraud', 'Hidden iframes'], countries: ['CN'] },
    { url: 'https://newshub.example.de', domain: 'newshub.example.de', company: 'NewsHub Media', verdict: 'suspicious', score: 50, summary: 'News with intrusive cookie consent.', red_flags: ['Dark-pattern consent'], countries: ['DE'] },
    { url: 'https://greymarket.example.pa', domain: 'greymarket.example.pa', company: 'GreyMarket Brokers', verdict: 'suspicious', score: 35, summary: 'Offshore data broker.', red_flags: ['Unverified subprocessors', 'Opaque ownership'], countries: ['PA', 'RU'] },
    { url: 'https://lottery-rewards.example', domain: 'lottery-rewards.example', company: null, verdict: 'suspicious', score: 28, summary: 'Sketchy rewards site.', red_flags: ['Asks for sensitive data', 'Fake testimonials'], countries: [] },
    { url: 'https://dating-coach.example', domain: 'dating-coach.example', company: null, verdict: 'suspicious', score: 48, summary: 'Affiliate-heavy dating funnel.', red_flags: ['Aggressive retargeting'], countries: ['US'] },
    { url: 'https://crypto-airdrop.example', domain: 'crypto-airdrop.example', company: null, verdict: 'suspicious', score: 18, summary: 'Crypto giveaway, wallet phishing potential.', red_flags: ['Asks wallet seed', 'Domain age 12 days'], countries: ['CN'] },
    { url: 'https://news-quizzes.example', domain: 'news-quizzes.example', company: null, verdict: 'suspicious', score: 52, summary: 'Quiz site farming personal data.', red_flags: ['Sells data to 3rd parties'], countries: ['US'] },
    { url: 'https://download-now.example', domain: 'download-now.example', company: null, verdict: 'suspicious', score: 32, summary: 'Bundled installer site.', red_flags: ['Bundled adware'], countries: ['RU'] },
    { url: 'https://cheap-meds.example.in', domain: 'cheap-meds.example.in', company: null, verdict: 'suspicious', score: 25, summary: 'Unregulated pharmacy.', red_flags: ['Unverified products'], countries: ['IN'] },
    { url: 'https://job-offer-now.example', domain: 'job-offer-now.example', company: null, verdict: 'suspicious', score: 38, summary: 'Recruiter scam suspected.', red_flags: ['Asks for passport upfront'], countries: [] },
    { url: 'https://tracker-aggregator.example', domain: 'tracker-aggregator.example', company: 'Adtech Global', verdict: 'suspicious', score: 45, summary: 'Aggregates 80+ trackers.', red_flags: ['Excessive tracking'], countries: ['US'] },

    // ---- PHISHING (12) ----
    { url: 'https://company-login-update-urgent.com', domain: 'company-login-update-urgent.com', company: null, verdict: 'phishing', score: 5, summary: 'Targeted spear phishing for AD credentials.', red_flags: ['Domain age < 7 days', 'Deceptive URL', 'Requests AD credentials'], countries: [] },
    { url: 'https://verify-bank-account.example', domain: 'verify-bank-account.example', company: null, verdict: 'phishing', score: 8, summary: 'Bank impersonation phishing.', red_flags: ['Fake SSL certificate', 'Typo-squatting domain'], countries: [] },
    { url: 'https://prize-winner-notice.example', domain: 'prize-winner-notice.example', company: null, verdict: 'phishing', score: 12, summary: 'Lottery scam phishing.', red_flags: ['Asks for credit card', 'Fake urgency banner'], countries: [] },
    { url: 'https://acme-payroll-login.example', domain: 'acme-payroll-login.example', company: null, verdict: 'phishing', score: 6, summary: 'Payroll impersonation.', red_flags: ['Lookalike domain'], countries: [] },
    { url: 'https://o365-reauth.example', domain: 'o365-reauth.example', company: null, verdict: 'phishing', score: 4, summary: 'Office365 reauth phishing.', red_flags: ['Captures MFA tokens'], countries: [] },
    { url: 'https://tax-refund-portal.example', domain: 'tax-refund-portal.example', company: null, verdict: 'phishing', score: 9, summary: 'Tax refund scam.', red_flags: ['Government impersonation'], countries: [] },
    { url: 'https://courier-redelivery.example', domain: 'courier-redelivery.example', company: null, verdict: 'phishing', score: 11, summary: 'Parcel redelivery scam.', red_flags: ['SMS phishing landing'], countries: [] },
    { url: 'https://hr-benefits-update.example', domain: 'hr-benefits-update.example', company: null, verdict: 'phishing', score: 7, summary: 'HR benefits credential harvest.', red_flags: ['Targets new hires'], countries: [] },
    { url: 'https://docusign-secure.example', domain: 'docusign-secure.example', company: null, verdict: 'phishing', score: 6, summary: 'DocuSign impersonation.', red_flags: ['Fake e-sign portal'], countries: [] },
    { url: 'https://invoice-overdue.example', domain: 'invoice-overdue.example', company: null, verdict: 'phishing', score: 10, summary: 'Invoice fraud.', red_flags: ['Spoofed sender domain'], countries: [] },
    { url: 'https://it-support-helpdesk.example', domain: 'it-support-helpdesk.example', company: null, verdict: 'phishing', score: 8, summary: 'Fake helpdesk callback phishing.', red_flags: ['Vishing landing page'], countries: [] },
    { url: 'https://shared-doc-review.example', domain: 'shared-doc-review.example', company: null, verdict: 'phishing', score: 11, summary: 'Drive impersonation phishing.', red_flags: ['Captures Google credentials'], countries: [] },

    // ---- UNKNOWN (5) ----
    { url: 'https://obscure-blog.example', domain: 'obscure-blog.example', company: null, verdict: 'unknown', score: 60, summary: 'Insufficient data — recently registered.', red_flags: ['Recently registered'], countries: [] },
    { url: 'https://forum-archive.example', domain: 'forum-archive.example', company: null, verdict: 'unknown', score: 65, summary: 'Defunct forum archive.', red_flags: [], countries: ['US'] },
    { url: 'https://hobby-project.example', domain: 'hobby-project.example', company: null, verdict: 'unknown', score: 62, summary: 'Personal project, low traffic.', red_flags: [], countries: ['DE'] },
    { url: 'https://research-paper.example', domain: 'research-paper.example', company: null, verdict: 'unknown', score: 70, summary: 'Academic page, no analysis available.', red_flags: [], countries: ['JP'] },
    { url: 'https://random-shop.example', domain: 'random-shop.example', company: null, verdict: 'unknown', score: 58, summary: 'Small shop, no published policies.', red_flags: [], countries: [] },
  ];

  console.log(`   • ${sites.length} sites planned`);

  type InsertedSite = { id: string; url: string; domain: string };
  const insertedSites: InsertedSite[] = [];
  for (const s of sites) {
    const { data, error } = await supabase
      .from('scanned_sites')
      .insert({
        url: s.url,
        domain: s.domain,
        url_hash: hashUrl(s.url),
        company_id: s.company ? companyIdByName.get(s.company) ?? null : null,
        scan_count: 5 + Math.floor(rand() * 800),
        last_analyzed_at: new Date().toISOString(),
      })
      .select('id, url, domain')
      .single();
    if (error) throw error;
    insertedSites.push(data!);
  }

  console.log('⚖️  Creating verdicts…');
  const verdictRows = sites.map((s, i) => ({
    site_id: insertedSites[i]!.id,
    verdict: s.verdict,
    score: s.score,
    summary: s.summary,
    red_flags: s.red_flags,
    data_processing_countries: s.countries,
    is_current: true,
  }));
  await bulkInsert('site_verdicts', verdictRows, 100);

  // Reload verdict_id per site (we need them for scan_history.verdict_id).
  const { data: allVerdicts } = await supabase
    .from('site_verdicts')
    .select('id, site_id')
    .eq('is_current', true);
  const verdictIdBySite = new Map<string, string>();
  for (const v of allVerdicts ?? []) verdictIdBySite.set(v.site_id, v.id);

  // ---------- 6. SCAN HISTORY (massive) ----------
  console.log('📈 Generating scan_history (target ~7 000 rows over 180 days)…');

  // Per-verdict weighting biases the demo toward realistic ratios
  // (lots of safe traffic, steady stream of risky outliers).
  const verdictWeight: Record<string, number> = {
    safe: 12,
    suspicious: 5,
    phishing: 2,
    unknown: 1,
  };
  const sitePicks = sites.map((s, i) => ({
    id: insertedSites[i]!.id,
    weight: verdictWeight[s.verdict] ?? 1,
  }));
  const totalWeight = sitePicks.reduce((s, p) => s + p.weight, 0);
  const pickSiteId = (): string => {
    let r = rand() * totalWeight;
    for (const p of sitePicks) {
      r -= p.weight;
      if (r <= 0) return p.id;
    }
    return sitePicks[0]!.id;
  };

  const scanRows: Array<{
    user_id: string;
    site_id: string;
    verdict_id: string | null;
    scanned_at: string;
  }> = [];

  for (const userId of userIds) {
    // 350–550 scans per user × 16 users ≈ 6 400–8 800 rows
    const scansForUser = 350 + Math.floor(rand() * 200);
    for (let i = 0; i < scansForUser; i++) {
      // bias slightly toward recent days so the 7-day window is dense too
      const daySkew = Math.pow(rand(), 1.4); // 0..1, skewed toward 0
      const dayOffset = Math.floor(daySkew * 180);
      const minuteOffset = Math.floor(rand() * 1440);
      const ts = Date.now() - dayOffset * 86400000 - minuteOffset * 60000;
      const siteId = pickSiteId();
      scanRows.push({
        user_id: userId,
        site_id: siteId,
        verdict_id: verdictIdBySite.get(siteId) ?? null,
        scanned_at: new Date(ts).toISOString(),
      });
    }
  }

  await bulkInsert('scan_history', scanRows, 500);
  console.log(`   • scan_history: ${scanRows.length} rows`);

  // ---------- 7. PARENTAL / SUPERVISOR ALERTS ----------
  console.log('🚨 Generating supervisor alerts…');

  const verdictByIdx = sites.map((s) => s.verdict);
  const riskySiteIdx: number[] = [];
  for (let i = 0; i < verdictByIdx.length; i++) {
    if (verdictByIdx[i] === 'phishing' || verdictByIdx[i] === 'suspicious') riskySiteIdx.push(i);
  }

  const alertRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 60; i++) {
    const idx = pick(riskySiteIdx);
    const v = verdictByIdx[idx]!;
    const userId = pick(userIds);
    const groupId = pick(groupIds);
    const event_type = v === 'phishing' ? 'visit_blocked' : 'suspicious_site_visited';
    const dayOffset = Math.floor(rand() * 60);
    alertRows.push({
      group_id: groupId,
      child_user_id: userId,
      site_id: insertedSites[idx]!.id,
      site_url: insertedSites[idx]!.url,
      event_type,
      details: {
        score: sites[idx]!.score,
        reason: v === 'phishing' ? 'Phishing domain match' : 'Suspicious tracking',
        red_flags: sites[idx]!.red_flags.slice(0, 2),
      },
      created_at: new Date(Date.now() - dayOffset * 86400000).toISOString(),
    });
  }
  await bulkInsert('parental_alerts', alertRows);
  console.log(`   • parental_alerts: ${alertRows.length} rows`);

  // ---------- 8. SUBMITTED DATA LOG (massive) ----------
  console.log('📝 Generating submitted_data_log…');

  const ALL_CATEGORIES = [
    'email',
    'password',
    'phone',
    'full_name',
    'address',
    'date_of_birth',
    'national_id',
    'credit_card',
    'other',
  ] as const;
  type DataCategory = (typeof ALL_CATEGORIES)[number];

  // Each user submits ~15 form posts across 90 days.
  // 16 users × 15 ≈ 240 submissions.
  const submittedRows: Array<{
    user_id: string;
    site_id: string;
    site_url: string;
    data_categories: DataCategory[];
    submitted_at: string;
  }> = [];

  for (const userId of userIds) {
    const count = 12 + Math.floor(rand() * 8); // 12–19
    for (let i = 0; i < count; i++) {
      // 60% chance to hit a risky site (so the leak chart fills nicely),
      // otherwise pick any site.
      const idx =
        rand() < 0.6
          ? riskySiteIdx[Math.floor(rand() * riskySiteIdx.length)]!
          : Math.floor(rand() * sites.length);
      const dayOffset = Math.floor(rand() * 90);
      const minuteOffset = Math.floor(rand() * 1440);
      const ts = Date.now() - dayOffset * 86400000 - minuteOffset * 60000;
      const catCount = 1 + Math.floor(rand() * 4); // 1–4 categories
      const cats = pickN(ALL_CATEGORIES, catCount) as DataCategory[];
      submittedRows.push({
        user_id: userId,
        site_id: insertedSites[idx]!.id,
        site_url: insertedSites[idx]!.url,
        data_categories: cats,
        submitted_at: new Date(ts).toISOString(),
      });
    }
  }

  // Insert submitted_data_log in chunks and capture inserted ids back.
  const allLogRows: Array<{
    id: string;
    user_id: string;
    site_id: string | null;
    site_url: string | null;
    data_categories: string[];
  }> = [];

  for (let i = 0; i < submittedRows.length; i += 200) {
    const slice = submittedRows.slice(i, i + 200);
    const { data, error } = await supabase
      .from('submitted_data_log')
      .insert(
        slice.map((r) => ({
          user_id: r.user_id,
          site_id: r.site_id,
          site_url: r.site_url,
          data_categories: [...r.data_categories],
          submitted_at: r.submitted_at,
        }))
      )
      .select('id, user_id, site_id, site_url, data_categories');
    if (error) throw error;
    if (data) allLogRows.push(...(data as typeof allLogRows));
  }
  console.log(`   • submitted_data_log: ${allLogRows.length} rows`);

  // ---------- 9. LEAK ALERTS ----------
  console.log('🔥 Generating leak_alerts…');

  const verdictBySiteId = new Map<string, 'safe' | 'suspicious' | 'phishing' | 'unknown'>(
    insertedSites.map((s, i) => [s.id, verdictByIdx[i]!])
  );
  const sensitive = new Set(['password', 'national_id', 'credit_card']);
  const moderate = new Set(['phone', 'address', 'date_of_birth', 'full_name']);

  const pickSeverity = (
    v: string,
    cats: string[]
  ): 'critical' | 'high' | 'medium' | 'low' => {
    const sens = cats.some((c) => sensitive.has(c));
    const mod = cats.some((c) => moderate.has(c));
    if (v === 'phishing') return sens ? 'critical' : 'high';
    if (v === 'suspicious') {
      if (sens) return 'high';
      if (mod) return 'medium';
      return 'low';
    }
    return 'low';
  };

  const leakInserts: Array<Record<string, unknown>> = [];
  let logIdx = 0;
  for (const row of allLogRows) {
    const v = verdictBySiteId.get(row.site_id ?? '') ?? 'unknown';
    if (v !== 'phishing' && v !== 'suspicious') {
      logIdx++;
      continue;
    }
    const cats = row.data_categories ?? [];
    const severity = pickSeverity(v, cats);
    const message =
      v === 'phishing'
        ? `Przekazano kategorie: ${cats.join(', ')} — strona ma werdykt phishing.`
        : `Przekazano kategorie: ${cats.join(', ')} — strona oznaczona jako podejrzana.`;
    // ~30% of alerts already acknowledged so the open/ack split is visible.
    const acknowledged_at =
      logIdx % 3 === 0 ? new Date(Date.now() - (logIdx + 1) * 3600000).toISOString() : null;
    leakInserts.push({
      user_id: row.user_id,
      submitted_data_log_id: row.id,
      site_id: row.site_id,
      site_url: row.site_url,
      data_categories: cats,
      severity,
      message,
      acknowledged_at,
    });
    logIdx++;
  }
  await bulkInsert('leak_alerts', leakInserts);
  console.log(`   • leak_alerts: ${leakInserts.length} rows`);

  console.log('\n🎉 ALL DONE! The corporate database is mega-seeded.');
  console.log('Login: ceo@company.com / Password123!  (or any of the 16 *@company.com emails)');
  console.log(`Totals: users=${userIds.length}, groups=${groupIds.length}, sites=${sites.length}, scans=${scanRows.length}, submissions=${allLogRows.length}, leaks=${leakInserts.length}, alerts=${alertRows.length}`);
}

main().catch(console.error);
