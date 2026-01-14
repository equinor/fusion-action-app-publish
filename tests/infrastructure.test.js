const fs = require('fs');
const path = require('path');

// Test that checks the basic functionality and structure of each script
describe('Script Infrastructure Tests', () => {

  test('All scripts exist in the scripts directory', () => {
    const scriptsDir = path.join(__dirname, '..', 'scripts');
    const expectedScripts = [
      'validate-artifact.js',
      'validate-env.js', 
      'validate-is-token-or-azure.js',
      'post-publish-metadata.js'
    ];

    expectedScripts.forEach(script => {
      const scriptPath = path.join(scriptsDir, script);
      expect(fs.existsSync(scriptPath)).toBe(true);
    });
  });

  test('Scripts have required dependencies imported', () => {
    const scriptsDir = path.join(__dirname, '..', 'scripts');
    const scripts = [
      'validate-artifact.js',
      'validate-env.js', 
      'validate-is-token-or-azure.js',
      'post-publish-metadata.js'
    ];

    scripts.forEach(script => {
      const scriptPath = path.join(scriptsDir, script);
      const content = fs.readFileSync(scriptPath, 'utf8');
      
      // Check that @actions/core is imported
      expect(content).toContain("require('@actions/core')");
      
      // Check that it has basic validation structure
      expect(content.length).toBeGreaterThan(100);
    });
  });

  test('post-publish-metadata.js exports functions', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'post-publish-metadata.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    // Check that module.exports exists for testable functions
    expect(content).toContain('module.exports');
  });

  test('Scripts contain expected functionality keywords', () => {
    const scriptChecks = [
      {
        script: 'validate-artifact.js',
        keywords: ['artifact', 'zip', 'existsSync']
      },
      {
        script: 'validate-env.js', 
        keywords: ['env', 'prNR', 'tag', 'ci', 'fprd']
      },
      {
        script: 'validate-is-token-or-azure.js',
        keywords: ['fusion-token', 'azure-client-id', 'BEARER', 'isToken']
      },
      {
        script: 'post-publish-metadata.js',
        keywords: ['manifest', 'github', 'postPrComment', 'extractAppManifest']
      }
    ];

    scriptChecks.forEach(({ script, keywords }) => {
      const scriptPath = path.join(__dirname, '..', 'scripts', script);
      const content = fs.readFileSync(scriptPath, 'utf8');
      
      keywords.forEach(keyword => {
        expect(content.toLowerCase()).toContain(keyword.toLowerCase());
      });
    });
  });

  test('Jest configuration is valid', () => {
    const jestConfigPath = path.join(__dirname, '..', 'jest.config.js');
    expect(fs.existsSync(jestConfigPath)).toBe(true);
    
    const config = require(jestConfigPath);
    expect(config.testEnvironment).toBe('node');
    expect(config.roots).toContain('<rootDir>/tests');
  });

  test('Package.json has test scripts configured', () => {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.scripts).toHaveProperty('test');
    expect(packageJson.scripts.test).toBe('jest');
    expect(packageJson.devDependencies).toHaveProperty('jest');
  });
});