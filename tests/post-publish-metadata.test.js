const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');

describe('post-publish-metadata.js', () => {
  let mockCore, mockGithub, mockFs, mockExec;
  let extractAppMetadata, generateAppUrl, postPrComment;
  
  beforeEach(() => {
    // Clear module cache
    jest.resetModules();
    
    // Create mocks
    mockCore = {
      getInput: jest.fn(),
      setFailed: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      setOutput: jest.fn()
    };
    
    mockFs = {
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn(),
      rmSync: jest.fn(),
      readdirSync: jest.fn().mockReturnValue([]),
      statSync: jest.fn().mockReturnValue({ isDirectory: () => false }),
      readFileSync: jest.fn().mockReturnValue('{}')
    };

    mockExec = jest.fn().mockResolvedValue({ stdout: '{}', stderr: '' });

    const mockOctokit = {
      rest: {
        issues: {
          createComment: jest.fn().mockResolvedValue({})
        }
      }
    };

    mockGithub = {
      getOctokit: jest.fn().mockReturnValue(mockOctokit),
      context: {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        payload: {}
      }
    };
    
    // Mock modules
    jest.doMock('@actions/core', () => mockCore);
    jest.doMock('@actions/github', () => mockGithub);
    jest.doMock('node:fs', () => mockFs);
    jest.doMock('node:util', () => ({ promisify: jest.fn(() => mockExec) }));
    jest.doMock('node:child_process', () => ({}));
    
    // Import the functions after mocking
    const module = require('../scripts/post-publish-metadata');
    extractAppMetadata = module.extractAppMetadata;
    generateAppUrl = module.generateAppUrl;
    postPrComment = module.postPrComment;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  describe('generateAppUrl', () => {
    test('should generate URL for fprd environment', () => {
      const manifest = { key: 'my-app' };
      const env = 'fprd';
      const tag = 'latest';

      const result = generateAppUrl(manifest, env, tag);
      
      expect(result).toBe('https://fusion.equinor.com/apps/my-app');
    });

    test('should generate URL with tag parameter for non-latest tags', () => {
      const manifest = { key: 'my-app' };
      const env = 'fqa';
      const tag = 'v1.2.3';

      const result = generateAppUrl(manifest, env, tag);
      
      expect(result).toBe('https://fusion.fqa.fusion-dev.net/apps/my-app?$tag=v1.2.3');
    });

    test('should generate URL when key is present', () => {
      const meta = { key: 'my-app' };
      const env = 'ci';
      const tag = 'latest';

      const result = generateAppUrl(meta, env, tag);
      
      expect(result).toBe('https://fusion.ci.fusion-dev.net/apps/my-app');
    });

    test('should generate URL with different environment', () => {
      const meta = { key: 'my-app' };
      const env = 'tr';
      const tag = 'latest';

      const result = generateAppUrl(meta, env, tag);
      
      expect(result).toBe('https://fusion.tr.fusion-dev.net/apps/my-app');
    });

    test('should handle all supported environments', () => {
      const manifest = { key: 'test-app' };
      const tag = 'latest';

      expect(generateAppUrl(manifest, 'ci', tag))
        .toBe('https://fusion.ci.fusion-dev.net/apps/test-app');
      
      expect(generateAppUrl(manifest, 'fqa', tag))
        .toBe('https://fusion.fqa.fusion-dev.net/apps/test-app');
      
      expect(generateAppUrl(manifest, 'fprd', tag))
        .toBe('https://fusion.equinor.com/apps/test-app');
      
      expect(generateAppUrl(manifest, 'tr', tag))
        .toBe('https://fusion.tr.fusion-dev.net/apps/test-app');
      
      expect(generateAppUrl(manifest, 'next', tag))
        .toBe('https://fusion.next.fusion-dev.net/apps/test-app');
    });

    test('should default to fprd URL for unknown environments', () => {
      const manifest = { key: 'my-app' };
      const env = 'unknown-env';
      const tag = 'latest';

      const result = generateAppUrl(manifest, env, tag);
      
      expect(result).toBe('https://fusion.equinor.com/apps/my-app');
    });

    test('should handle PR tags correctly', () => {
      const manifest = { key: 'my-app' };
      const env = 'ci';
      const tag = 'pr-123';

      const result = generateAppUrl(manifest, env, tag);
      
      expect(result).toBe('https://fusion.ci.fusion-dev.net/apps/my-app?$tag=pr-123');
    });

    test('should throw error when no app identifier found', () => {
      const meta = { description: 'An app without key' };
      const env = 'fprd';
      const tag = 'latest';

      expect(() => generateAppUrl(meta, env, tag))
        .toThrow('App key not found in metadata');
    });
  });

  describe('extractAppMetadata', () => {
    test('should extract metadata from zip file using unzip -p', async () => {
      const metadataContent = JSON.stringify({
        name: 'fusion-framework-cookbook-app-react',
        version: '4.1.8'
      });

      mockExec.mockResolvedValue({ stdout: metadataContent, stderr: '' });

      const result = await extractAppMetadata('/path/to/app.zip');
      
      expect(mockExec).toHaveBeenCalledWith('unzip -p "/path/to/app.zip" "*/metadata.json"');
      expect(result).toEqual({
        name: 'fusion-framework-cookbook-app-react',
        version: '4.1.8',
        key: 'fusion-framework-cookbook-app-react'
      });
    });

    test('should handle warnings from unzip command', async () => {
      const metadataContent = JSON.stringify({ name: 'test-app', version: '1.0.0' });
      mockExec.mockResolvedValue({ stdout: metadataContent, stderr: 'Warning: some files skipped' });

      const result = await extractAppMetadata('/path/to/app.zip');
      
      expect(mockCore.warning).toHaveBeenCalledWith('Warning from unzip: Warning: some files skipped');
      expect(result).toEqual({
        name: 'test-app',
        version: '1.0.0',
        key: 'test-app'
      });
    });

    test('should throw error for unsupported file format', async () => {
      await expect(extractAppMetadata('/path/to/app.txt'))
        .rejects.toThrow('Unsupported artifact format: .txt. Only .zip files are supported.');
    });

    test('should throw error when metadata not found (empty output)', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '' });

      await expect(extractAppMetadata('/path/to/app.zip'))
        .rejects.toThrow('metadata.json not found in artifact');
    });

    test('should handle exec command errors', async () => {
      mockExec.mockRejectedValue(new Error('unzip command failed'));

      await expect(extractAppMetadata('/path/to/app.zip'))
        .rejects.toThrow('unzip command failed');
      
      expect(mockCore.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to extract app metadata')
      );
    });

    test('should handle invalid JSON in metadata', async () => {
      mockExec.mockResolvedValue({ stdout: 'invalid json content', stderr: '' });

      await expect(extractAppMetadata('/path/to/app.zip'))
        .rejects.toThrow('Invalid JSON format in metadata.json');
    });

    test('should handle whitespace around metadata content', async () => {
      const metadataContent = JSON.stringify({ name: 'test-app', version: '2.0.0' });
      mockExec.mockResolvedValue({ stdout: `  \n${metadataContent}\n  `, stderr: '' });

      const result = await extractAppMetadata('/path/to/app.zip');
      
      expect(result).toEqual({
        name: 'test-app',
        version: '2.0.0',
        key: 'test-app'
      });
    });

    test('should include additional fields from metadata.json', async () => {
      const metadataContent = JSON.stringify({
        name: 'my-app',
        version: '3.0.0',
        description: 'My custom app',
        author: 'Test Author'
      });
      mockExec.mockResolvedValue({ stdout: metadataContent, stderr: '' });

      const result = await extractAppMetadata('/path/to/app.zip');
      
      expect(result).toEqual({
        name: 'my-app',
        version: '3.0.0',
        description: 'My custom app',
        author: 'Test Author',
        key: 'my-app'
      });
    });
  });

  describe('postPrComment', () => {
    let mockOctokit;

    beforeEach(() => {
      mockOctokit = {
        rest: {
          issues: {
            createComment: jest.fn().mockResolvedValue({})
          }
        }
      };
      
      mockGithub.getOctokit.mockReturnValue(mockOctokit);
      mockGithub.context = {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        payload: {}
      };
      
      process.env.GITHUB_TOKEN = 'test-token';
    });

    test('should post comment for PR deployment', async () => {
      const meta = {
        name: 'Test App',
        version: '1.0.0',
        key: 'test-app',
        description: 'A test application'
      };
      
      mockGithub.context.payload.pull_request = { number: 123 };

      await postPrComment(meta, 'fprd', 'v1.0.0', 
        'https://fusion.equinor.com/apps/test-app', 
        'https://fusion.equinor.com/admin/test-app');

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        body: expect.stringContaining('🚀 Application Deployed Successfully')
      });

      const calledWith = mockOctokit.rest.issues.createComment.mock.calls[0][0];
      expect(calledWith.body).toContain('Test App');
      expect(calledWith.body).toContain('1.0.0');
      expect(calledWith.body).toContain('FPRD');
      expect(calledWith.body).toContain('A test application');
    });

    test('should extract PR number from pr- tag', async () => {
      const meta = { name: 'Test App', key: 'test-app' };
      mockGithub.context.payload = {}; // No PR in payload

      await postPrComment(meta, 'ci', 'pr-456', 
        'https://fusion.ci.fusion-dev.net/apps/test-app', 
        'https://admin.url');

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
        expect.objectContaining({ issue_number: 456 })
      );
    });

    test('should skip comment when no PR number available', async () => {
      const meta = { name: 'Test App' };
      mockGithub.context.payload = {}; // No PR context

      await postPrComment(meta, 'fprd', 'v1.0.0', 'https://app.url', 'https://admin.url');

      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Not a PR deployment, skipping PR comment');
    });

    test('should skip comment when GITHUB_TOKEN not available', async () => {
      delete process.env.GITHUB_TOKEN;
      const meta = { name: 'Test App' };

      await postPrComment(meta, 'fprd', 'v1.0.0', 'https://app.url', 'https://admin.url');

      expect(mockCore.info).toHaveBeenCalledWith('GITHUB_TOKEN not available, skipping PR comment');
      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    });

    test('should handle comment creation errors gracefully', async () => {
      const meta = { name: 'Test App', key: 'test-app' };
      mockGithub.context.payload.pull_request = { number: 123 };
      
      mockOctokit.rest.issues.createComment.mockRejectedValue(
        new Error('API Error')
      );

      await postPrComment(meta, 'fprd', 'v1.0.0', 'https://app.url', 'https://admin.url');

      expect(mockCore.warning).toHaveBeenCalledWith('Failed to post PR comment: API Error');
    });

    test('should use fallback values for missing metadata fields', async () => {
      const meta = { name: 'test-app', key: 'test-app' }; // Missing version, description
      mockGithub.context.payload.pull_request = { number: 123 };

      await postPrComment(meta, 'fprd', 'v1.0.0', 'https://app.url', 'https://admin.url');

      const calledWith = mockOctokit.rest.issues.createComment.mock.calls[0][0];
      expect(calledWith.body).toContain('**Application:** test-app');
      expect(calledWith.body).toContain('**Version:** unknown');
      expect(calledWith.body).not.toContain('**Description:**');
    });

    test('should include all required sections in comment body', async () => {
      const meta = {
        name: 'Test App',
        version: '1.0.0',
        key: 'test-app',
        entry: { path: './bundle.js' }
      };
      mockGithub.context.payload.pull_request = { number: 123 };

      await postPrComment(meta, 'fprd', 'v1.0.0', 
        'https://fusion.equinor.com/apps/test-app',
        'https://admin.url');

      const calledWith = mockOctokit.rest.issues.createComment.mock.calls[0][0];
      const body = calledWith.body;
      
      expect(body).toContain('🚀 Application Deployed Successfully');
      expect(body).toContain('🔗 Access Links');
      expect(body).toContain('📋 Deployment Details');
      expect(body).toContain('Bundle:** ./bundle.js');
      expect(body).toContain('fusion-action-app-publish');
    });
  });
});