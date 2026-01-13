#!/usr/bin/env node

/**
 * validate.js
 * Validates inputs for Fusion Framework CLI 'app publish' command
 * Run with: node validate.js <env> <artifact> <token> <client-id> <tenant-id> <resource-id>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 6) {
  console.error('Usage: node validate.js <env> <artifact> <token> <client-id> <tenant-id> <resource-id> [pr-env-prefix]');
  console.error('Example: node validate.js auto ./dist "" client-id tenant-id https://fusion.equinor.com pr');
  process.exit(1);
}

const [env, artifact, token, clientId, tenantId, resourceId, prEnvPrefix = 'pr'] = args;

// Valid environments - Fusion-specific environment names
const VALID_ENVS = ['ci', 'fqa', 'fprd', 'tr', 'auto'];
const CUSTOM_ENV_PATTERNS = [
  /^pr-\d+$/,      // PR environments: pr-123
  /^ci-.+$/,       // CI variants: ci-feature
  /^fqa-.+$/,      // FQA variants: fqa-release
  /^tr-.+$/,       // TR variants: tr-test
];

// Authentication validation
const hasToken = token && token.trim() !== '';
const hasSP = [clientId, tenantId, resourceId].every(param => param && param.trim() !== '');

console.log('🔍 Validating Fusion App Publish inputs...\n');

// 1. Authentication method validation
if (hasToken && hasSP) {
  console.error('❌ ERROR: Conflicting authentication methods');
  console.error('   Provide EITHER fusion-token OR Service Principal credentials, not both.');
  console.error('   • fusion-token: Direct bearer token');
  console.error('   • SP credentials: azure-client-id + azure-tenant-id + azure-resource-id');
  process.exit(1);
}

if (!hasToken && !hasSP) {
  console.error('❌ ERROR: Missing authentication credentials');
  console.error('   Provide one of the following:');
  console.error('   • fusion-token: Pre-acquired Fusion bearer token');
  console.error('   • Azure credentials: azure-client-id + azure-tenant-id + azure-resource-id');
  console.error('   • Azure Login supports both Service Principal and OIDC/Federated credentials');
  process.exit(1);
}

if (hasToken) {
  console.log('✅ Authentication: Using provided Fusion token');
  // Basic token format validation (JWT tokens are typically longer)
  if (token.length < 100) {
    console.warn('⚠️  WARNING: Token seems unusually short - verify it\'s a valid bearer token');
  }
} else {
  console.log('✅ Authentication: Using Azure credentials (SP or OIDC)');
  console.log('   ℹ️  Azure Login will auto-detect OIDC/Federated credentials if available');
  console.log(`   Client ID: ${clientId.substring(0, 8)}...`);
  console.log(`   Tenant ID: ${tenantId.substring(0, 8)}...`);
  console.log(`   Resource ID: ${resourceId}`);
}

// 2. Environment validation
if (!env || !env.trim()) {
  console.error('❌ ERROR: Environment is missing or empty');
  process.exit(1);
}

const envLower = env.toLowerCase().trim();

// Check standard environments first
if (VALID_ENVS.includes(envLower)) {
  if (envLower === 'auto') {
    console.log('🔄 Environment: auto (will be resolved at runtime)');
    console.log('   • PR: Uses pr-<number> format');
    console.log('   • Main/Master: Uses fprd (Fusion Production)');
    console.log('   • Other branches: Uses ci (Continuous Integration)');
  } else {
    console.log(`✅ Environment: ${env}`);
  }
} else {
  // Check custom environment patterns
  const matchesCustomPattern = CUSTOM_ENV_PATTERNS.some(pattern => pattern.test(env));
  
  if (matchesCustomPattern) {
    console.log(`✅ Environment: ${env} (custom environment)`);
    if (env.startsWith('pr-')) {
      console.log('   ℹ️  PR environment detected - ensure Fusion backend supports this');
    }
  } else {
    console.error(`❌ ERROR: Invalid environment "${env}"`);
    console.error(`   Standard environments: ${VALID_ENVS.filter(e => e !== 'auto').join(', ')}`);
    console.error('   Custom patterns supported:');
    console.error('     • pr-<number> (e.g., pr-123)');
    console.error('     • ci-<suffix> (e.g., ci-feature)');
    console.error('     • fqa-<suffix> (e.g., fqa-release)');
    console.error('     • tr-<suffix> (e.g., tr-test)');
    console.error('   Tip: Use "auto" for automatic PR/branch-based selection');
    process.exit(1);
  }
}

// 3. Artifact path validation
if (!artifact || !artifact.trim()) {
  console.error('❌ ERROR: Artifact path is missing or empty');
  console.error('   Usually this should be a folder like ./dist, ./build, or a zip file');
  process.exit(1);
}

const artifactPath = path.resolve(process.cwd(), artifact);
console.log(`🔍 Checking artifact: ${artifact}`);
console.log(`   Resolved path: ${artifactPath}`);

if (!fs.existsSync(artifactPath)) {
  console.error(`❌ ERROR: Artifact not found at "${artifact}"`);
  console.error(`   Full path: ${artifactPath}`);
  console.error('\n   Possible fixes:');
  console.error('     • Ensure build step runs before publish (build-before-publish: true)');
  console.error('     • Check working-directory is correct');
  console.error('     • Verify artifact path matches build output');
  console.error('     • Check if build script uses different output directory');
  process.exit(1);
}

let stats;
try {
  stats = fs.statSync(artifactPath);
} catch (err) {
  console.error(`❌ ERROR: Cannot access artifact: ${err.message}`);
  process.exit(1);
}

if (stats.isDirectory()) {
  console.log('📁 Artifact is a directory');
  
  // Check for common build output files
  const files = fs.readdirSync(artifactPath);
  const hasIndexHtml = files.includes('index.html');
  const hasManifest = files.some(f => f.includes('manifest') && f.endsWith('.json'));
  const hasJsFiles = files.some(f => f.endsWith('.js'));
  const hasCssFiles = files.some(f => f.endsWith('.css'));
  
  console.log(`   Files found: ${files.length}`);
  
  if (hasIndexHtml) {
    console.log('   ✅ index.html found');
  } else {
    console.warn('   ⚠️  No index.html found - verify this is correct');
  }
  
  if (hasJsFiles) {
    console.log('   ✅ JavaScript files found');
  }
  
  if (hasCssFiles) {
    console.log('   ✅ CSS files found');
  }
  
  if (hasManifest) {
    console.log('   ✅ Manifest file found');
  }
  
  if (!hasIndexHtml && !hasJsFiles) {
    console.warn('\n   ⚠️  WARNING: Directory exists but looks empty or not built properly');
    console.warn('      Expected at least index.html or JavaScript bundle files');
    console.warn('      Publishing may fail if this is not the correct build output');
  }
  
} else if (stats.isFile()) {
  const ext = path.extname(artifact).toLowerCase();
  const sizeKB = (stats.size / 1024).toFixed(1);
  
  console.log(`📄 Artifact is a file (${sizeKB} KB)`);
  
  if (['.zip', '.tar.gz', '.tgz'].includes(ext)) {
    console.log('   ✅ Archive format detected');
  } else if (ext === '.js') {
    console.log('   ✅ JavaScript bundle detected');
  } else {
    console.warn(`   ⚠️  Unusual file extension: ${ext}`);
    console.warn('      Fusion CLI typically expects directories or archives');
  }
} else {
  console.error(`❌ ERROR: Artifact path is neither file nor directory: ${artifact}`);
  process.exit(1);
}

// 4. Additional checks for package.json context and CLI integration
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    console.log(`\n📦 Project: ${pkg.name || 'unnamed'} v${pkg.version || '0.0.0'}`);
    
    // Check if fusion-framework-cli is listed as dependency
    const hasFusionCLI = 
      (pkg.dependencies && pkg.dependencies['@equinor/fusion-framework-cli']) ||
      (pkg.devDependencies && pkg.devDependencies['@equinor/fusion-framework-cli']);
    
    if (hasFusionCLI) {
      const cliVersion = 
        (pkg.dependencies && pkg.dependencies['@equinor/fusion-framework-cli']) ||
        (pkg.devDependencies && pkg.devDependencies['@equinor/fusion-framework-cli']);
      console.log(`   ✅ Fusion Framework CLI found in dependencies (${cliVersion})`);
    } else {
      console.log('   ℹ️  Fusion Framework CLI will be installed during action execution');
    }
    
    // Check for common Fusion app patterns
    const hasAppConfig = fs.existsSync(path.join(process.cwd(), 'app.config.js')) ||
                       fs.existsSync(path.join(process.cwd(), 'app.config.ts')) ||
                       fs.existsSync(path.join(process.cwd(), 'fusion.config.js'));
    
    if (hasAppConfig) {
      console.log('   ✅ Fusion app configuration found');
    } else {
      console.warn('   ⚠️  No Fusion app config detected - verify this is a Fusion app');
    }
    
    // Check build scripts
    if (pkg.scripts) {
      const hasBuildScript = pkg.scripts.build || pkg.scripts['build:app'] || pkg.scripts.compile;
      if (hasBuildScript) {
        console.log('   ✅ Build script available in package.json');
      } else {
        console.warn('   ⚠️  No build script found - ensure build-before-publish is configured correctly');
      }
    }
    
  } catch (err) {
    console.warn('   ⚠️  Could not parse package.json - continuing anyway');
  }
} else {
  console.log('\n📦 No package.json found in current directory');
  console.warn('   ⚠️  This may not be a Node.js project - verify CLI installation will work');
}

// 5. Runtime environment checks
console.log('\n🔧 Runtime Environment:');
const nodeVersion = process.version;
console.log(`   Node.js: ${nodeVersion}`);

if (parseInt(nodeVersion.slice(1)) < 18) {
  console.warn('   ⚠️  Node.js version < 18 may cause issues with fusion-framework-cli');
}

// Check if we're in a Git repository for metadata collection
if (fs.existsSync(path.join(process.cwd(), '.git'))) {
  console.log('   ✅ Git repository detected (metadata will be included)');
} else {
  console.warn('   ⚠️  Not a Git repository - some metadata may be missing');
}

console.log('\n🎉 All validations passed! Ready to publish to Fusion.');
console.log(`   Environment: ${env}${env === 'auto' ? ' (will be resolved)' : ''}`);
console.log(`   Artifact: ${artifact}`);
console.log(`   Auth method: ${hasToken ? 'Bearer Token' : 'Azure (SP/OIDC)'}`);
console.log(`   CLI: @equinor/fusion-framework-cli`);

if (env.startsWith('pr-') || env === 'auto') {
  console.log('\n💡 Pro Tips:');
  console.log('   • PR environments may require special Fusion backend configuration');
  console.log('   • Use outputs.app-url and outputs.portal-url for PR comments');
  console.log('   • Consider rate limiting with many concurrent PR builds');
}

process.exit(0);