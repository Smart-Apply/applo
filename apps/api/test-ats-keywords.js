#!/usr/bin/env node

/**
 * Test script for ATS keyword extraction with CSRF support
 * Tests the improved prompt that excludes soft skills and generic terms
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

  // Add cookies
  if (Object.keys(cookies).length > 0) {
    headers.Cookie = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Extract cookies from response
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    // Parse set-cookie header (can be comma-separated)
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
  console.log('🔐 Logging in as demo user...');
  const cookies = {};

  // Get CSRF token first
  const csrfResponse = await fetchWithCookies(`${API_BASE}/auth/csrf-token`, {}, cookies);
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;

  console.log('✓ Got CSRF token');

  // Login with CSRF token
  const loginResponse = await fetchWithCookies(
    `${API_BASE}/auth/login`,
    {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(TEST_USER),
    },
    cookies,
  );

  if (!loginResponse.ok) {
    const error = await loginResponse.json();
    throw new Error(`Login failed: ${JSON.stringify(error)}`);
  }

  const user = await loginResponse.json();
  console.log(`✓ Logged in as: ${user.email}\n`);

  return { cookies, csrfToken, userId: user.id };
}

async function getApplications(cookies, csrfToken) {
  console.log('📋 Fetching applications...');
  const response = await fetchWithCookies(
    `${API_BASE}/applications?includeJobPosting=true`,
    {},
    cookies,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to fetch applications: ${JSON.stringify(error)}`);
  }

  const applications = await response.json();
  console.log(`✓ Found ${applications.length} applications\n`);

  return applications;
}

async function regenerateWithSinglePipeline(appId, cookies, csrfToken) {
  console.log(`🚀 Regenerating application ${appId} with single-LLM pipeline...\n`);
  const startTime = Date.now();

  const response = await fetchWithCookies(
    `${API_BASE}/applications/${appId}/regenerate-single-pipeline`,
    {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
      },
    },
    cookies,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Regeneration failed: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`✓ Pipeline completed in ${duration}s\n`);
  return result;
}

function analyzeKeywords(atsKeywords) {
  console.log('🔍 ATS KEYWORDS ANALYSIS');
  console.log('========================\n');

  const categories = ['hard_skills', 'tools_and_tech', 'domains', 'methodologies'];
  let totalCount = 0;
  const allKeywords = [];

  categories.forEach((category) => {
    const keywords = atsKeywords[category] || [];
    totalCount += keywords.length;

    if (keywords.length > 0) {
      console.log(`${category.toUpperCase().replace('_', ' ')} (${keywords.length}):`);
      keywords.forEach((kw) => {
        console.log(`  ✓ ${kw.keyword} [${kw.source}] (priority: ${kw.priority})`);
        allKeywords.push(kw.keyword.toLowerCase());
      });
      console.log('');
    }
  });

  console.log(`TOTAL KEYWORDS: ${totalCount}/20`);

  // Check for soft skills that should be excluded
  const softSkillPatterns = [
    /team/i,
    /kommunikation/i,
    /anerkennung/i,
    /unterstützung/i,
    /austausch/i,
    /kundenorientiert/i,
    /respekt/i,
    /wertschätzung/i,
    /flexib/i,
    /motivation/i,
    /professionell/i,
    /expertise/i,
    /sprachkenntnis/i,
    /berufserfahrung/i,
    /studium/i,
    /ausbildung/i,
  ];

  const problematicKeywords = allKeywords.filter((kw) =>
    softSkillPatterns.some((pattern) => pattern.test(kw)),
  );

  if (problematicKeywords.length > 0) {
    console.log('\n⚠️  WARNING: Found potentially problematic keywords:');
    problematicKeywords.forEach((kw) => console.log(`  ❌ ${kw}`));
  } else {
    console.log('\n✅ No soft skills or generic terms detected!');
  }

  if (totalCount > 20) {
    console.log(`\n❌ FAILED: Too many keywords (${totalCount} > 20)`);
    return false;
  } else if (totalCount === 0) {
    console.log('\n❌ FAILED: No keywords extracted');
    return false;
  } else {
    console.log(`\n✅ PASSED: ${totalCount} keywords within limit`);
    return true;
  }
}

async function main() {
  try {
    console.log('🧪 Testing ATS Keyword Extraction (Improved Prompt)\n');
    console.log('================================================\n');

    // Login
    const { cookies, csrfToken, userId } = await login();

    // Get applications
    const applications = await getApplications(cookies, csrfToken);

    if (applications.length === 0) {
      console.log('❌ No applications found. Create one first.');
      process.exit(1);
    }

    // Use first application
    const app = applications[0];
    console.log(`Testing with application: ${app.id}`);
    console.log(`Job: ${app.jobPosting?.title || 'Unknown'}\n`);

    // Regenerate
    const result = await regenerateWithSinglePipeline(app.id, cookies, csrfToken);

    // Debug: show what we got
    console.log('📦 Result keys:', Object.keys(result));
    console.log('📦 Status:', result.status);

    // Analyze keywords
    if (result.atsKeywords) {
      const passed = analyzeKeywords(result.atsKeywords);

      console.log('\n📊 TAILORED PROFILE SUMMARY');
      console.log('===========================\n');

      if (result.tailoredProfile) {
        const tp = result.tailoredProfile;
        console.log(`Hard Skills: ${tp.selected_hard_skills?.length || 0}/12`);
        console.log(`Soft Skills: ${tp.selected_soft_skills?.length || 0}/6`);
        console.log(`Tools: ${tp.selected_tools?.length || 0}/8`);
        console.log(`Experiences: ${tp.selected_experiences?.length || 0}/5`);
        console.log(`Projects: ${tp.selected_projects?.length || 0}/5`);
      }

      console.log('\n✨ Test completed!\n');
      process.exit(passed ? 0 : 1);
    } else {
      console.log('❌ No ATS keywords in POST result');
      console.log('\n💡 Fetching full application data...');

      // Fetch the application to see if atsKeywords are there
      const appResponse = await fetchWithCookies(`${API_BASE}/applications/${app.id}`, {}, cookies);
      const fullApp = await appResponse.json();

      if (fullApp.atsKeywords) {
        console.log('✅ Found atsKeywords in GET response!\n');
        const passed = analyzeKeywords(fullApp.atsKeywords);
        process.exit(passed ? 0 : 1);
      } else {
        console.log('❌ atsKeywords not found even in GET response');
        console.log('Full application keys:', Object.keys(fullApp));
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
