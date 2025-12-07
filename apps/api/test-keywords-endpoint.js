#!/usr/bin/env node

/**
 * Test the /applications/:id/keywords endpoint to verify it uses new atsKeywords
 */

const API_BASE = 'http://localhost:3000/api/v1';
const TEST_USER = {
  email: 'demo@smartapply.com',
  password: 'Demo123!',
};

async function fetchWithCookies(url, options = {}, cookies = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (Object.keys(cookies).length > 0) {
    headers.Cookie = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const cookieParts = setCookieHeader.split(/,(?=[^;]*=)/);
    cookieParts.forEach((cookie) => {
      const [nameValue] = cookie.split(';');
      if (nameValue && nameValue.includes('=')) {
        const [name, value] = nameValue.split('=');
        if (name && value) {
          cookies[name.trim()] = value.trim();
        }
      }
    });
  }

  return response;
}

async function login() {
  console.log('🔐 Logging in...');
  const cookies = {};

  const csrfResponse = await fetchWithCookies(`${API_BASE}/auth/csrf-token`, {}, cookies);
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;

  const loginResponse = await fetchWithCookies(
    `${API_BASE}/auth/login`,
    {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(TEST_USER),
    },
    cookies,
  );

  if (!loginResponse.ok) {
    throw new Error('Login failed');
  }

  console.log('✓ Logged in\n');
  return { cookies, csrfToken };
}

async function getApplications(cookies) {
  const response = await fetchWithCookies(`${API_BASE}/applications`, {}, cookies);
  return response.json();
}

async function getKeywordsAnalysis(appId, cookies) {
  console.log(`📊 Fetching keywords analysis for application ${appId}...\n`);
  const response = await fetchWithCookies(`${API_BASE}/applications/${appId}/keywords`, {}, cookies);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function main() {
  try {
    console.log('🧪 Testing Keywords Endpoint\n');
    console.log('============================\n');

    const { cookies } = await login();

    const applications = await getApplications(cookies);
    if (applications.length === 0) {
      console.log('❌ No applications found');
      process.exit(1);
    }

    // Use the most recent application
    const app = applications[0];
    console.log(`Testing with: ${app.title || app.jobPosting?.title}`);
    console.log(`Application ID: ${app.id}\n`);

    const analysis = await getKeywordsAnalysis(app.id, cookies);

    console.log('📈 ANALYSIS RESULTS');
    console.log('===================\n');

    console.log(`Overall Score: ${analysis.matchAnalysis.overallScore}%`);
    console.log(`Tech Match: ${analysis.matchAnalysis.techScore}%`);
    console.log(`Soft Match: ${analysis.matchAnalysis.softScore}%\n`);

    console.log(`Total Keywords: ${analysis.matchedKeywords.length + analysis.missingKeywords.length}`);
    console.log(`✅ Matched: ${analysis.matchedKeywords.length}`);
    console.log(`❌ Missing: ${analysis.missingKeywords.length}\n`);

    console.log('🔍 KEYWORD BREAKDOWN BY CATEGORY\n');

    const categories = {};
    [...analysis.matchedKeywords, ...analysis.missingKeywords].forEach((kw) => {
      if (!categories[kw.category]) {
        categories[kw.category] = { matched: 0, missing: 0, keywords: [] };
      }
      if (kw.found) {
        categories[kw.category].matched++;
      } else {
        categories[kw.category].missing++;
      }
      categories[kw.category].keywords.push({
        keyword: kw.keyword,
        found: kw.found,
        confidence: kw.confidence,
      });
    });

    Object.entries(categories).forEach(([category, data]) => {
      const total = data.matched + data.missing;
      const percent = Math.round((data.matched / total) * 100);
      console.log(`${category.toUpperCase()}: ${data.matched}/${total} (${percent}%)`);
      
      // Show first 5 keywords
      data.keywords.slice(0, 5).forEach((kw) => {
        const icon = kw.found ? '✓' : '✗';
        const conf = kw.confidence ? ` (${Math.round(kw.confidence * 100)}%)` : '';
        console.log(`  ${icon} ${kw.keyword}${conf}`);
      });
      
      if (data.keywords.length > 5) {
        console.log(`  ... and ${data.keywords.length - 5} more`);
      }
      console.log('');
    });

    // Check for soft skills (should be 0)
    const softSkillsCount =
      categories.soft?.matched || 0 + categories.soft?.missing || 0;
    if (softSkillsCount > 0) {
      console.log(`⚠️  WARNING: ${softSkillsCount} soft skills detected (should be 0)`);
    } else {
      console.log('✅ No soft skills detected (expected behavior)');
    }

    console.log('\n✨ Test completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
