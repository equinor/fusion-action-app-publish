const fs = require('fs');
const path = require('path');

// Create a more isolated approach to testing by intercepting the module loading
describe('validate-artifact.js', () => {
  let mockCore, mockFs;
  
  beforeEach(() => {
    // Clear module cache
    jest.resetModules();
    
    // Create mocks
    mockCore = {
      getInput: jest.fn(),
      setFailed: jest.fn(),
      info: jest.fn(),
      setOutput: jest.fn()
    };
    
    mockFs = {
      existsSync: jest.fn()
    };
    
    // Mock the modules before they are loaded
    jest.doMock('@actions/core', () => mockCore);
    jest.doMock('fs', () => mockFs);
  });
  
  afterEach(() => {
    jest.dontMock('@actions/core');
    jest.dontMock('fs');
  });

  describe('Input validation', () => {
    test('should fail when artifact input is not provided', () => {
      mockCore.getInput.mockReturnValue('');
      
      // Import the script, which will execute the validation
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.getInput).toHaveBeenCalledWith('artifact');
      expect(mockCore.setFailed).toHaveBeenCalledWith("Input 'artifact' is required.");
    });

    test('should fail when artifact input is undefined', () => {
      mockCore.getInput.mockReturnValue(undefined);
      
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith("Input 'artifact' is required.");
    });

    test('should fail when artifact input is null', () => {
      mockCore.getInput.mockReturnValue(null);
      
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith("Input 'artifact' is required.");
    });
  });

  describe('File existence validation', () => {
    test('should fail when artifact file does not exist', () => {
      mockCore.getInput.mockReturnValue('non-existent-file.zip');
      mockFs.existsSync.mockReturnValue(false);
      
      require('../scripts/validate-artifact.js');
      
      const expectedPath = path.resolve('non-existent-file.zip');
      expect(mockFs.existsSync).toHaveBeenCalledWith(expectedPath);
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        `Artifact file does not exist at path: ${expectedPath}`
      );
    });

    test('should pass file existence check when file exists', () => {
      mockCore.getInput.mockReturnValue('existing-file.zip');
      mockFs.existsSync.mockReturnValue(true);
      
      require('../scripts/validate-artifact.js');
      
      expect(mockFs.existsSync).toHaveBeenCalled();
      // Should not fail on file existence
      expect(mockCore.setFailed).not.toHaveBeenCalledWith(
        expect.stringContaining('does not exist')
      );
    });
  });

  describe('File extension validation', () => {
    beforeEach(() => {
      // Always pass file existence check for extension tests
      mockFs.existsSync.mockReturnValue(true);
    });

    test('should fail for unsupported file extension .txt', () => {
      mockCore.getInput.mockReturnValue('test-file.txt');
      
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'Artifact file must be one of the following types: .zip'
      );
    });

    test('should fail for unsupported file extension .pdf', () => {
      mockCore.getInput.mockReturnValue('test-file.pdf');
      
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'Artifact file must be one of the following types: .zip'
      );
    });

    test('should fail for file without extension', () => {
      mockCore.getInput.mockReturnValue('test-file');
      
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'Artifact file must be one of the following types: .zip'
      );
    });

    test('should pass for .zip extension', () => {
      mockCore.getInput.mockReturnValue('test-file.zip');
      
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Artifact validation passed.');
    });

    test('should fail for .tar extension (no longer supported)', () => {
      mockCore.getInput.mockReturnValue('test-file.tar');
      
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'Artifact file must be one of the following types: .zip'
      );
    });

    test('should fail for .rar extension (no longer supported)', () => {
      mockCore.getInput.mockReturnValue('test-file.rar');
      
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'Artifact file must be one of the following types: .zip'
      );
    });

    test('should handle case insensitive extensions (.ZIP)', () => {
      mockCore.getInput.mockReturnValue('test-file.ZIP');
      
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Artifact validation passed.');
    });
  });

  describe('Output setting', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
    });

    test('should set artifact-path output when validation passes', () => {
      const artifactFile = 'test-file.zip';
      mockCore.getInput.mockReturnValue(artifactFile);
      
      require('../scripts/validate-artifact.js');
      
      const expectedPath = path.resolve(artifactFile);
      expect(mockCore.setOutput).toHaveBeenCalledWith('artifact-path', expectedPath);
    });

    test('should set absolute path for relative input', () => {
      const artifactFile = './relative/path/test-file.zip';
      mockCore.getInput.mockReturnValue(artifactFile);
      
      require('../scripts/validate-artifact.js');
      
      const expectedPath = path.resolve(artifactFile);
      expect(mockCore.setOutput).toHaveBeenCalledWith('artifact-path', expectedPath);
    });

    test('should handle already absolute paths', () => {
      const absolutePath = '/absolute/path/test-file.zip';
      mockCore.getInput.mockReturnValue(absolutePath);
      
      require('../scripts/validate-artifact.js');
      
      expect(mockCore.setOutput).toHaveBeenCalledWith('artifact-path', absolutePath);
    });
  });

  describe('Complete validation flow', () => {
    test('should complete successful validation with all checks', () => {
      mockCore.getInput.mockReturnValue('valid-artifact.zip');
      mockFs.existsSync.mockReturnValue(true);
      
      require('../scripts/validate-artifact.js');
      
      // Verify all expected calls happened
      expect(mockCore.getInput).toHaveBeenCalledWith('artifact');
      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Artifact validation passed.');
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'artifact-path', 
        path.resolve('valid-artifact.zip')
      );
    });
  });
});