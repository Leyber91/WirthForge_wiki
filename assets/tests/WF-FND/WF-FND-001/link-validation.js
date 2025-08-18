#!/usr/bin/env node

/**
 * WF-FND-001 Link Validation Script
 * Validates all internal and external links in WF-FND-001 documentation
 * Ensures link integrity and accessibility compliance
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  baseDir: 'c:/LocalProjects/WIRTHFORGE_WIKI/WIRTHFORGEWIKI/GPT_5_DOCUMENTS',
  timeout: 10000,
  retries: 3,
  userAgent: 'WIRTHFORGE-LinkValidator/1.0',
  excludePatterns: [
    /localhost/,
    /127\.0\.0\.1/,
    /example\.com/,
    /placeholder/
  ],
  internalDomains: [
    'wirthforge.ai',
    'docs.wirthforge.ai'
  ]
};

// Link validation results
const results = {
  total: 0,
  valid: 0,
  invalid: 0,
  warnings: 0,
  errors: []
};

/**
 * Extract links from markdown content
 */
function extractLinks(content, filePath) {
  const links = [];
  
  // Markdown link pattern: [text](url)
  const markdownLinks = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  markdownLinks.forEach(match => {
    const urlMatch = match.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (urlMatch) {
      links.push({
        text: urlMatch[1],
        url: urlMatch[2],
        type: 'markdown',
        file: filePath,
        line: getLineNumber(content, match)
      });
    }
  });

  // HTML link pattern: <a href="url">
  const htmlLinks = content.match(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi) || [];
  htmlLinks.forEach(match => {
    const urlMatch = match.match(/href\s*=\s*["']([^"']+)["']/i);
    if (urlMatch) {
      links.push({
        text: match,
        url: urlMatch[1],
        type: 'html',
        file: filePath,
        line: getLineNumber(content, match)
      });
    }
  });

  // Reference-style links: [text]: url
  const refLinks = content.match(/^\s*\[([^\]]+)\]:\s*(.+)$/gm) || [];
  refLinks.forEach(match => {
    const urlMatch = match.match(/^\s*\[([^\]]+)\]:\s*(.+)$/);
    if (urlMatch) {
      links.push({
        text: urlMatch[1],
        url: urlMatch[2],
        type: 'reference',
        file: filePath,
        line: getLineNumber(content, match)
      });
    }
  });

  return links;
}

/**
 * Get line number of match in content
 */
function getLineNumber(content, match) {
  const index = content.indexOf(match);
  if (index === -1) return 0;
  return content.substring(0, index).split('\n').length;
}

/**
 * Validate internal file link
 */
function validateInternalLink(url, baseFile) {
  const basePath = path.dirname(baseFile);
  let targetPath;

  if (url.startsWith('/')) {
    // Absolute path from project root
    targetPath = path.join(CONFIG.baseDir, url.substring(1));
  } else if (url.startsWith('./') || url.startsWith('../')) {
    // Relative path
    targetPath = path.resolve(basePath, url);
  } else if (!url.includes('://')) {
    // Relative path without ./
    targetPath = path.resolve(basePath, url);
  } else {
    return null; // External link
  }

  // Remove anchor fragments
  const cleanPath = targetPath.split('#')[0];
  
  try {
    const stats = fs.statSync(cleanPath);
    return {
      valid: true,
      exists: true,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      path: cleanPath
    };
  } catch (error) {
    return {
      valid: false,
      exists: false,
      error: error.message,
      path: cleanPath
    };
  }
}

/**
 * Validate external HTTP/HTTPS link
 */
function validateExternalLink(url) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    
    // Parse URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      resolve({
        valid: false,
        error: `Invalid URL format: ${error.message}`,
        statusCode: null
      });
      return;
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'HEAD',
      timeout: CONFIG.timeout,
      headers: {
        'User-Agent': CONFIG.userAgent
      }
    };

    const req = client.request(options, (res) => {
      resolve({
        valid: res.statusCode >= 200 && res.statusCode < 400,
        statusCode: res.statusCode,
        redirected: res.statusCode >= 300 && res.statusCode < 400,
        finalUrl: res.headers.location || url
      });
    });

    req.on('error', (error) => {
      resolve({
        valid: false,
        error: error.message,
        statusCode: null
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        valid: false,
        error: 'Request timeout',
        statusCode: null
      });
    });

    req.end();
  });
}

/**
 * Validate single link with retries
 */
async function validateLink(link) {
  results.total++;

  // Skip excluded patterns
  if (CONFIG.excludePatterns.some(pattern => pattern.test(link.url))) {
    console.log(`⏭️  Skipped: ${link.url} (excluded pattern)`);
    return { ...link, status: 'skipped', reason: 'excluded pattern' };
  }

  // Check if internal link
  const internalResult = validateInternalLink(link.url, link.file);
  if (internalResult) {
    if (internalResult.valid) {
      results.valid++;
      console.log(`✅ Valid internal: ${link.url}`);
      return { ...link, status: 'valid', type: 'internal', ...internalResult };
    } else {
      results.invalid++;
      results.errors.push({
        file: link.file,
        line: link.line,
        url: link.url,
        error: internalResult.error
      });
      console.log(`❌ Invalid internal: ${link.url} - ${internalResult.error}`);
      return { ...link, status: 'invalid', type: 'internal', ...internalResult };
    }
  }

  // External link validation with retries
  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      const externalResult = await validateExternalLink(link.url);
      
      if (externalResult.valid) {
        results.valid++;
        console.log(`✅ Valid external: ${link.url} (${externalResult.statusCode})`);
        return { ...link, status: 'valid', type: 'external', ...externalResult };
      } else if (attempt === CONFIG.retries) {
        results.invalid++;
        results.errors.push({
          file: link.file,
          line: link.line,
          url: link.url,
          error: externalResult.error || `HTTP ${externalResult.statusCode}`
        });
        console.log(`❌ Invalid external: ${link.url} - ${externalResult.error || externalResult.statusCode}`);
        return { ...link, status: 'invalid', type: 'external', ...externalResult };
      } else {
        console.log(`⚠️  Retry ${attempt}/${CONFIG.retries}: ${link.url}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      if (attempt === CONFIG.retries) {
        results.invalid++;
        results.errors.push({
          file: link.file,
          line: link.line,
          url: link.url,
          error: error.message
        });
        console.log(`❌ Error validating: ${link.url} - ${error.message}`);
        return { ...link, status: 'error', error: error.message };
      }
    }
  }
}

/**
 * Process all markdown files in directory
 */
function processDirectory(dir) {
  const files = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory() && !item.startsWith('.')) {
        scanDir(fullPath);
      } else if (stats.isFile() && (item.endsWith('.md') || item.endsWith('.markdown'))) {
        files.push(fullPath);
      }
    }
  }
  
  scanDir(dir);
  return files;
}

/**
 * Generate validation report
 */
function generateReport(validationResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalLinks: results.total,
      validLinks: results.valid,
      invalidLinks: results.invalid,
      successRate: results.total > 0 ? ((results.valid / results.total) * 100).toFixed(2) : 0
    },
    errors: results.errors,
    details: validationResults
  };

  // Write JSON report
  const reportPath = path.join(CONFIG.baseDir, 'tests/WF-FND-001/link-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Write human-readable report
  const readableReport = `# WF-FND-001 Link Validation Report

Generated: ${report.timestamp}

## Summary
- **Total Links**: ${report.summary.totalLinks}
- **Valid Links**: ${report.summary.validLinks}
- **Invalid Links**: ${report.summary.invalidLinks}
- **Success Rate**: ${report.summary.successRate}%

## Errors
${report.errors.length === 0 ? 'No errors found! 🎉' : ''}
${report.errors.map(error => `
### ${error.file}:${error.line}
- **URL**: ${error.url}
- **Error**: ${error.error}
`).join('')}

## Recommendations
${report.summary.successRate < 95 ? '⚠️ Link validation success rate is below 95%. Please review and fix invalid links.' : ''}
${report.summary.successRate >= 95 && report.summary.successRate < 100 ? '✅ Good link validation rate. Consider fixing remaining issues.' : ''}
${report.summary.successRate === 100 ? '🎉 Perfect! All links are valid.' : ''}

---
*Generated by WIRTHFORGE Link Validation Script*
`;

  const readableReportPath = path.join(CONFIG.baseDir, 'tests/WF-FND-001/link-validation-report.md');
  fs.writeFileSync(readableReportPath, readableReport);

  return report;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔗 Starting WF-FND-001 Link Validation...\n');

  // Find all markdown files in WF-FND-001 directories
  const wfFndDirs = [
    path.join(CONFIG.baseDir, 'docs/WF-FND-001'),
    path.join(CONFIG.baseDir, 'assets'),
    path.join(CONFIG.baseDir, 'tests/WF-FND-001')
  ];

  const allFiles = [];
  for (const dir of wfFndDirs) {
    if (fs.existsSync(dir)) {
      allFiles.push(...processDirectory(dir));
    }
  }

  console.log(`📁 Found ${allFiles.length} markdown files to process\n`);

  // Extract all links
  const allLinks = [];
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const links = extractLinks(content, file);
    allLinks.push(...links);
  }

  console.log(`🔗 Found ${allLinks.length} links to validate\n`);

  // Validate all links
  const validationResults = [];
  for (const link of allLinks) {
    const result = await validateLink(link);
    validationResults.push(result);
    
    // Add small delay to avoid overwhelming servers
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Generate report
  console.log('\n📊 Generating validation report...');
  const report = generateReport(validationResults);

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('🏁 VALIDATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`📊 Total Links: ${report.summary.totalLinks}`);
  console.log(`✅ Valid: ${report.summary.validLinks}`);
  console.log(`❌ Invalid: ${report.summary.invalidLinks}`);
  console.log(`📈 Success Rate: ${report.summary.successRate}%`);
  console.log('='.repeat(50));

  if (report.summary.invalidLinks > 0) {
    console.log('\n❌ Some links failed validation. Check the report for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All links validated successfully!');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateLink,
  extractLinks,
  validateInternalLink,
  validateExternalLink,
  CONFIG
};
