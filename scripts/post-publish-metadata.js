
/**
 * post-publish-metadata.js
 * Posts metadata about the published application for the GitHub Action
 * Used as part of GitHub Action workflows to provide publish information
 */

const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('child_process');

/**
 * Extracts app manifest from the artifact
 * @param {string} artifactPath - Path to the artifact
 * @returns {Object} - Parsed app manifest
 */
function extractAppManifest(artifactPath) {
  try {
    // Create a temporary directory for extraction
    const tempDir = path.join(__dirname, '..', '.temp-extract');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Extract the artifact to temp directory (only zip format supported for now)
    const artifactExtension = path.extname(artifactPath).toLowerCase();
    let extractCommand;
    
    if (artifactExtension === '.zip') {
      extractCommand = `unzip -q "${artifactPath}" -d "${tempDir}"`;
    } else {
      throw new Error(`Unsupported artifact format: ${artifactExtension}. Only .zip files are supported.`);
    }

    execSync(extractCommand, { stdio: 'pipe' });

    // Look for app.manifest.json in the extracted files
    const manifestPath = findFileRecursively(tempDir, 'app.manifest.json');
    
    if (!manifestPath) {
      throw new Error('app.manifest.json not found in artifact');
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    return manifest;
  } catch (error) {
    core.error(`Failed to extract app manifest: ${error.message}`);
    throw error;
  }
}

/**
 * Recursively find a file by name in a directory
 * @param {string} dir - Directory to search
 * @param {string} filename - File to find
 * @returns {string|null} - Path to file or null if not found
 */
function findFileRecursively(dir, filename) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const found = findFileRecursively(filePath, filename);
      if (found) return found;
    } else if (file === filename) {
      return filePath;
    }
  }
  
  return null;
}

/**
 * Generates application URL based on environment and app info
 * @param {Object} manifest - App manifest object
 * @param {string} env - Environment (ci, fqa, fprd, tr, next)
 * @param {string} tag - Deployment tag
 * @returns {string} - Application URL
 */
function generateAppUrl(manifest, env, tag) {
  const appKey = manifest.key || manifest.appKey || manifest.name;
  
  if (!appKey) {
    throw new Error('App key/name not found in manifest');
  }

  // Environment-specific Fusion portal base URLs
  const envUrls = {
    'ci': 'https://fusion.ci.fusion-dev.net',
    'fqa': 'https://fusion.fqa.fusion-dev.net', 
    'fprd': 'https://fusion.equinor.com',
    'tr': 'https://fusion.tr.fusion-dev.net',
    'next': 'https://fusion.next.fusion-dev.net'
  };

  const baseUrl = envUrls[env] || envUrls['fprd'];
  
  // Construct application URL
  if (!tag.startsWith('latest')) {
    return `${baseUrl}/apps/${appKey}?$tag=${tag}`;
  }
  
  return `${baseUrl}/apps/${appKey}`;
}

/**
 * Posts a comment to the PR with the application URL and deployment info
 * @param {Object} manifest - App manifest object
 * @param {string} env - Environment
 * @param {string} tag - Deployment tag
 * @param {string} appUrl - Application URL
 * @param {string} appAdminUrl - Application Admin URL
 */
async function postPrComment(manifest, env, tag, appUrl, appAdminUrl) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      core.info('GITHUB_TOKEN not available, skipping PR comment');
      return;
    }

    const octokit = github.getOctokit(token);
    const context = github.context;

    // Only post comment for PR events or when PR number is available
    const prNumber = context.payload.pull_request?.number || 
                    (tag && tag.startsWith('pr-') ? parseInt(tag.replace('pr-', '')) : null);

    if (!prNumber) {
      core.info('Not a PR deployment, skipping PR comment');
      return;
    }

    const appName = manifest.displayName || manifest.name || manifest.key;
    const appVersion = manifest.version || 'unknown';
    const appDescription = manifest.description || '';

    // Create formatted comment with deployment details
    const commentBody = `## 🚀 Application Deployed Successfully

**Application:** ${appName}  
**Version:** ${appVersion}  
**Environment:** ${env.toUpperCase()}  
**Tag:** ${tag}  

${appDescription ? `**Description:** ${appDescription}\n\n` : ''}

### 🔗 Access Links
- **Application:** [Open ${appName}](${appUrl})
- **Fusion App Admin:** [Manage in Fusion App Admin](${appAdminUrl})
- **App Config:** [View app config](${appAdminUrl}/config)

### 📋 Deployment Details
- **App Key:** \`${manifest.key || manifest.appKey || manifest.name}\`
- **Bundle:** ${manifest.entry?.path || 'Not specified'}
- **Build Time:** ${new Date().toISOString()}

---
*Deployed via [fusion-action-app-publish](https://github.com/equinor/fusion-action-app-publish)*`;

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: commentBody
    });

    core.info(`Posted deployment comment to PR #${prNumber}`);
  } catch (error) {
    core.warning(`Failed to post PR comment: ${error.message}`);
  }
}

/**
 * Main function to extract metadata and post publish information
 */
async function postPublishMetadata() {
  try {
    const artifact = core.getInput('artifact');
    const env = core.getInput('env');
    const tag = core.getInput('tag');
    const workingDirectory = core.getInput('working-directory') || '.';

    core.info(`Processing artifact: ${artifact}`);
    core.info(`Environment: ${env}`);
    core.info(`Tag: ${tag}`);

    // Resolve artifact path
    const artifactPath = path.resolve(workingDirectory, artifact);
    
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }

    // Extract app manifest from artifact
    const manifest = extractAppManifest(artifactPath);
    
    const appName = manifest.displayName || manifest.name || manifest.key;
    const appVersion = manifest.version || 'unknown';
    const appKey = manifest.key || manifest.appKey;

    core.info(`App Name: ${appName}`);
    core.info(`App Version: ${appVersion}`);
    core.info(`App Key: ${appKey}`);

    // Generate application URL
    const appUrl = generateAppUrl(manifest, env, tag);
    core.info(`App URL: ${appUrl}`);

    // Set outputs for use in other steps
    core.setOutput('app-name', appName);
    core.setOutput('app-version', appVersion);
    core.setOutput('app-key', appKey);
    core.setOutput('app-url', appUrl);

    // Generate app admin URL
    const appAdminBaseUrl = appUrl.split('/apps/')[0];
    const appAdminUrl = `${appAdminBaseUrl}/apps/app-admin/apps/${appKey}`;
    core.setOutput('app-admin-url', appAdminUrl);

    // Create formatted publish info for PR comments
    const publishInfo = `🚀 **${appName}** v${appVersion} deployed to **${env.toUpperCase()}**\n[Open Application](${appUrl})`;
    core.setOutput('publish-info', publishInfo);

    // Post comment to PR if applicable
    await postPrComment(manifest, env, tag, appUrl, appAdminUrl);

    core.info('Post-publish metadata processing completed successfully');

  } catch (error) {
    core.setFailed(`Post-publish metadata failed: ${error.message}`);
  }
}

// Execute if called directly
if (require.main === module) {
  postPublishMetadata();
}

module.exports = {
  postPublishMetadata,
  extractAppManifest,
  generateAppUrl,
  postPrComment,
  findFileRecursively
};