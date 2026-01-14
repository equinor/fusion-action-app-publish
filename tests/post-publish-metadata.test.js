const fs = require('fs');
const path = require('path');

describe('post-publish-metadata.js', () => {
  let mockCore, mockGithub, mockFs, mockExecSync, mockFindFileRecursively;
  let extractAppManifest, generateAppUrl, postPrComment, findFileRecursively;
  
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

    mockExecSync = jest.fn();

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
    jest.doMock('fs', () => mockFs);
    jest.doMock('child_process', () => ({ execSync: mockExecSync }));
    
    // Import the functions after mocking
    const module = require('../scripts/post-publish-metadata');
    extractAppManifest = module.extractAppManifest;
    generateAppUrl = module.generateAppUrl;
    postPrComment = module.postPrComment;
    findFileRecursively = module.findFileRecursively;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  describe('findFileRecursively', () => {
    test('should find file in root directory', () => {
      mockFs.readdirSync.mockReturnValue(['app.manifest.json', 'other-file.js']);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false });

      const result = findFileRecursively('/test/dir', 'app.manifest.json');
      
      expect(result).toBe(path.join('/test/dir', 'app.manifest.json'));
    });

    test('should find file in nested directory', () => {
      mockFs.readdirSync
        .mockReturnValueOnce(['subdirectory', 'other-file.js'])
        .mockReturnValueOnce(['app.manifest.json']);
      
      mockFs.statSync
        .mockReturnValueOnce({ isDirectory: () => true })
        .mockReturnValueOnce({ isDirectory: () => false })
        .mockReturnValueOnce({ isDirectory: () => false });

      const result = findFileRecursively('/test/dir', 'app.manifest.json');
      
      expect(result).toBe(path.join('/test/dir/subdirectory', 'app.manifest.json'));
    });

    test('should return null when file not found', () => {
      mockFs.readdirSync.mockReturnValue(['other-file.js', 'another-file.txt']);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false });

      const result = findFileRecursively('/test/dir', 'app.manifest.json');
      
      expect(result).toBeNull();
    });

    test('should search recursively through multiple levels', () => {
      mockFs.readdirSync
        .mockReturnValueOnce(['level1'])
        .mockReturnValueOnce(['level2'])
        .mockReturnValueOnce(['app.manifest.json']);
      
      mockFs.statSync
        .mockReturnValueOnce({ isDirectory: () => true })
        .mockReturnValueOnce({ isDirectory: () => true })
        .mockReturnValueOnce({ isDirectory: () => false });

      const result = findFileRecursively('/test/dir', 'app.manifest.json');
      
      expect(result).toBe(path.join('/test/dir/level1/level2', 'app.manifest.json'));
    });
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

    test('should use appKey as fallback for app identifier', () => {
      const manifest = { appKey: 'my-app' };
      const env = 'ci';
      const tag = 'latest';

      const result = generateAppUrl(manifest, env, tag);
      
      expect(result).toBe('https://fusion.ci.fusion-dev.net/apps/my-app');
    });

    test('should use name as fallback for app identifier', () => {
      const manifest = { name: 'my-app' };
      const env = 'tr';
      const tag = 'latest';

      const result = generateAppUrl(manifest, env, tag);
      
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
      const manifest = { description: 'An app without key/appKey/name' };
      const env = 'fprd';
      const tag = 'latest';

      expect(() => generateAppUrl(manifest, env, tag))
        .toThrow('App key/name not found in manifest');
    });
  });

  describe('extractAppManifest', () => {
    beforeEach(() => {
      // Mock findFileRecursively to return a valid path by default
      mockFs.readdirSync.mockReturnValue(['app.manifest.json']);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false });
    });

    test('should extract manifest from zip file', () => {
      const manifestContent = JSON.stringify({
        key: 'test-app',
        version: '1.0.0',
        displayName: 'Test App'
      });

      mockFs.readFileSync.mockReturnValue(manifestContent);
      mockExecSync.mockImplementation(() => {});

      const result = extractAppManifest('/path/to/app.zip');
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('unzip -q "/path/to/app.zip"'),
        { stdio: 'pipe' }
      );
      expect(result).toEqual({
        key: 'test-app',
        version: '1.0.0',
        displayName: 'Test App'
      });
    });

    test('should throw error for tar file (no longer supported)', () => {
      expect(() => extractAppManifest('/path/to/app.tar'))
        .toThrow('Unsupported artifact format: .tar. Only .zip files are supported.');
    });

    test('should throw error for rar file (no longer supported)', () => {
      expect(() => extractAppManifest('/path/to/app.rar'))
        .toThrow('Unsupported artifact format: .rar. Only .zip files are supported.');
    });

    test('should throw error for unsupported file format', () => {
      expect(() => extractAppManifest('/path/to/app.txt'))
        .toThrow('Unsupported artifact format: .txt. Only .zip files are supported.');
    });

    test('should throw error when manifest not found', () => {
      mockFs.readdirSync.mockReturnValue(['other-file.js']); // No manifest file

      expect(() => extractAppManifest('/path/to/app.zip'))
        .toThrow('app.manifest.json not found in artifact');
    });

    test('should handle extraction errors', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Extraction failed');
      });

      expect(() => extractAppManifest('/path/to/app.zip'))
        .toThrow('Extraction failed');
      
      expect(mockCore.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to extract app manifest')
      );
    });

    test('should handle invalid JSON in manifest', () => {
      mockFs.readFileSync.mockReturnValue('invalid json content');

      expect(() => extractAppManifest('/path/to/app.zip'))
        .toThrow();
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
      const manifest = {
        displayName: 'Test App',
        version: '1.0.0',
        key: 'test-app',
        description: 'A test application'
      };
      
      mockGithub.context.payload.pull_request = { number: 123 };

      await postPrComment(manifest, 'fprd', 'v1.0.0', 
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
      const manifest = { displayName: 'Test App', key: 'test-app' };
      mockGithub.context.payload = {}; // No PR in payload

      await postPrComment(manifest, 'ci', 'pr-456', 
        'https://fusion.ci.fusion-dev.net/apps/test-app', 
        'https://admin.url');

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
        expect.objectContaining({ issue_number: 456 })
      );
    });

    test('should skip comment when no PR number available', async () => {
      const manifest = { displayName: 'Test App' };
      mockGithub.context.payload = {}; // No PR context

      await postPrComment(manifest, 'fprd', 'v1.0.0', 'https://app.url', 'https://admin.url');

      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Not a PR deployment, skipping PR comment');
    });

    test('should skip comment when GITHUB_TOKEN not available', async () => {
      delete process.env.GITHUB_TOKEN;
      const manifest = { displayName: 'Test App' };

      await postPrComment(manifest, 'fprd', 'v1.0.0', 'https://app.url', 'https://admin.url');

      expect(mockCore.info).toHaveBeenCalledWith('GITHUB_TOKEN not available, skipping PR comment');
      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    });

    test('should handle comment creation errors gracefully', async () => {
      const manifest = { displayName: 'Test App', key: 'test-app' };
      mockGithub.context.payload.pull_request = { number: 123 };
      
      mockOctokit.rest.issues.createComment.mockRejectedValue(
        new Error('API Error')
      );

      await postPrComment(manifest, 'fprd', 'v1.0.0', 'https://app.url', 'https://admin.url');

      expect(mockCore.warning).toHaveBeenCalledWith('Failed to post PR comment: API Error');
    });

    test('should use fallback values for missing manifest fields', async () => {
      const manifest = { key: 'test-app' }; // Missing displayName, version, description
      mockGithub.context.payload.pull_request = { number: 123 };

      await postPrComment(manifest, 'fprd', 'v1.0.0', 'https://app.url', 'https://admin.url');

      const calledWith = mockOctokit.rest.issues.createComment.mock.calls[0][0];
      expect(calledWith.body).toContain('**Application:** test-app');
      expect(calledWith.body).toContain('**Version:** unknown');
      expect(calledWith.body).not.toContain('**Description:**');
    });

    test('should include all required sections in comment body', async () => {
      const manifest = {
        displayName: 'Test App',
        version: '1.0.0',
        key: 'test-app',
        entry: { path: './bundle.js' }
      };
      mockGithub.context.payload.pull_request = { number: 123 };

      await postPrComment(manifest, 'fprd', 'v1.0.0', 
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