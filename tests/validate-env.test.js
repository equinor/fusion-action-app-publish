describe('validate-env.js', () => {
  let mockCore;
  
  beforeEach(() => {
    // Clear module cache
    jest.resetModules();
    
    // Create mock
    mockCore = {
      getInput: jest.fn(),
      setFailed: jest.fn(),
      info: jest.fn(),
      setOutput: jest.fn()
    };
    
    // Mock the module before it is loaded
    jest.doMock('@actions/core', () => mockCore);
  });
  
  afterEach(() => {
    jest.dontMock('@actions/core');
  });

  describe('PR number handling', () => {
    test('should set tag and env outputs when prNR is provided', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '123';
        if (input === 'env') return '';
        if (input === 'tag') return '';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.info).toHaveBeenCalledWith('prNR provided: 123');
      expect(mockCore.setOutput).toHaveBeenCalledWith('tag', 'pr-123');
      expect(mockCore.setOutput).toHaveBeenCalledWith('env', 'ci');
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    test('should handle prNR with different values', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '456';
        if (input === 'env') return '';
        if (input === 'tag') return '';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.info).toHaveBeenCalledWith('prNR provided: 456');
      expect(mockCore.setOutput).toHaveBeenCalledWith('tag', 'pr-456');
      expect(mockCore.setOutput).toHaveBeenCalledWith('env', 'ci');
    });

    test('should handle string prNR that looks like number', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '789';
        if (input === 'env') return '';
        if (input === 'tag') return '';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setOutput).toHaveBeenCalledWith('tag', 'pr-789');
      expect(mockCore.setOutput).toHaveBeenCalledWith('env', 'ci');
    });

    test('should return early when prNR is provided (skip other validations)', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '123';
        if (input === 'env') return ''; // Invalid env, but should be ignored
        if (input === 'tag') return ''; // Missing tag, but should be ignored
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(mockCore.setOutput).toHaveBeenCalledWith('tag', 'pr-123');
      expect(mockCore.setOutput).toHaveBeenCalledWith('env', 'ci');
    });
  });

  describe('Environment validation (when no prNR)', () => {
    test('should fail when env input is not provided', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '';
        if (input === 'env') return '';
        if (input === 'tag') return 'v1.0.0';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith("Input 'env' is required.");
    });

    test('should fail when env input is undefined', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '';
        if (input === 'env') return undefined;
        if (input === 'tag') return 'v1.0.0';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith("Input 'env' is required.");
    });

    test('should fail for invalid environment value', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '';
        if (input === 'env') return 'invalid-env';
        if (input === 'tag') return 'v1.0.0';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Input 'env' must be one of the following values: ci, tr, fprd, fqa, next."
      );
    });

    test('should fail for case sensitive environment (uppercase)', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '';
        if (input === 'env') return 'CI';
        if (input === 'tag') return 'v1.0.0';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Input 'env' must be one of the following values: ci, tr, fprd, fqa, next."
      );
    });

    describe('Valid environments', () => {
      const validEnvs = ['ci', 'tr', 'fprd', 'fqa', 'next'];
      
      validEnvs.forEach(env => {
        test(`should pass for valid environment: ${env}`, () => {
          mockCore.getInput.mockImplementation((input) => {
            if (input === 'prNR') return '';
            if (input === 'env') return env;
            if (input === 'tag') return 'v1.0.0';
            return '';
          });
          
          require('../scripts/validate-env.js');
          
          expect(mockCore.setFailed).not.toHaveBeenCalled();
          expect(mockCore.info).toHaveBeenCalledWith('Environment validation passed.');
        });
      });
    });
  });

  describe('Tag validation (when no prNR)', () => {
    test('should fail when tag input is not provided', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '';
        if (input === 'env') return 'ci';
        if (input === 'tag') return '';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith("Input 'tag' is required.");
    });

    test('should fail when tag input is undefined', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '';
        if (input === 'env') return 'ci';
        if (input === 'tag') return undefined;
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith("Input 'tag' is required.");
    });

    test('should fail when tag input is null', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '';
        if (input === 'env') return 'ci';
        if (input === 'tag') return null;
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith("Input 'tag' is required.");
    });
  });

  describe('Output setting (successful validation)', () => {
    test('should set env and tag outputs when validation passes', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '';
        if (input === 'env') return 'fqa';
        if (input === 'tag') return 'v2.1.0';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setOutput).toHaveBeenCalledWith('env', 'fqa');
      expect(mockCore.setOutput).toHaveBeenCalledWith('tag', 'v2.1.0');
      expect(mockCore.info).toHaveBeenCalledWith('Environment validation passed.');
    });

    test('should handle different valid combinations', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '';
        if (input === 'env') return 'fprd';
        if (input === 'tag') return 'latest';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setOutput).toHaveBeenCalledWith('env', 'fprd');
      expect(mockCore.setOutput).toHaveBeenCalledWith('tag', 'latest');
    });
  });

  describe('Complete validation flows', () => {
    test('should complete successful validation with env and tag', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '';
        if (input === 'env') return 'next';
        if (input === 'tag') return 'v1.2.3-beta';
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      // Verify all expected calls happened
      expect(mockCore.getInput).toHaveBeenCalledWith('prNR');
      expect(mockCore.getInput).toHaveBeenCalledWith('env');
      expect(mockCore.getInput).toHaveBeenCalledWith('tag');
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Environment validation passed.');
      expect(mockCore.setOutput).toHaveBeenCalledWith('env', 'next');
      expect(mockCore.setOutput).toHaveBeenCalledWith('tag', 'v1.2.3-beta');
    });

    test('should prioritize prNR over env/tag validation', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'prNR') return '999';
        if (input === 'env') return 'invalid-env'; // This should be ignored
        if (input === 'tag') return ''; // This should be ignored
        return '';
      });
      
      require('../scripts/validate-env.js');
      
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(mockCore.setOutput).toHaveBeenCalledWith('tag', 'pr-999');
      expect(mockCore.setOutput).toHaveBeenCalledWith('env', 'ci');
    });
  });
});