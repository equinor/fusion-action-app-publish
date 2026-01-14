describe('validate-is-token-or-azure.js', () => {
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

  describe('Missing credentials validation', () => {
    test('should fail when neither fusion-token nor Azure credentials are provided', () => {
      mockCore.getInput.mockImplementation((input) => {
        return ''; // All inputs empty
      });
      
      require('../scripts/validate-is-token-or-azure.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Either 'fusion-token' or all Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided."
      );
    });

    test('should fail when only some Azure credentials are provided', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'fusion-token') return '';
        if (input === 'azure-client-id') return 'client-123';
        if (input === 'azure-tenant-id') return '';
        if (input === 'azure-resource-id') return '';
        return '';
      });
      
      require('../scripts/validate-is-token-or-azure.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Either 'fusion-token' or all Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided."
      );
    });

    test('should fail when only two Azure credentials are provided', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'fusion-token') return '';
        if (input === 'azure-client-id') return 'client-123';
        if (input === 'azure-tenant-id') return 'tenant-456';
        if (input === 'azure-resource-id') return '';
        return '';
      });
      
      require('../scripts/validate-is-token-or-azure.js');
      
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Either 'fusion-token' or all Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided."
      );
    });
  });

  describe('Azure credentials validation', () => {
    test('should pass and skip fusion-token validation when all Azure credentials are provided', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'fusion-token') return '';
        if (input === 'azure-client-id') return 'client-123';
        if (input === 'azure-tenant-id') return 'tenant-456';
        if (input === 'azure-resource-id') return 'resource-789';
        return '';
      });
      
      require('../scripts/validate-is-token-or-azure.js');
      
      expect(mockCore.info).toHaveBeenCalledWith(
        'Azure credentials provided, skipping fusion-token validation.'
      );
      expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', false);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    test('should handle Azure credentials with empty fusion-token', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'fusion-token') return null;
        if (input === 'azure-client-id') return 'my-client-id';
        if (input === 'azure-tenant-id') return 'my-tenant-id';
        if (input === 'azure-resource-id') return 'my-resource-id';
        return '';
      });
      
      require('../scripts/validate-is-token-or-azure.js');
      
      expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', false);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Fusion token validation', () => {
    describe('Token presence validation', () => {
      test('should fail when fusion-token is empty string', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return '';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setFailed).toHaveBeenCalledWith(
          "Either 'fusion-token' or all Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided."
        );
      });

      test('should fail when fusion-token is only whitespace', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return '   ';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setFailed).toHaveBeenCalledWith(
          "Input 'fusion-token' must be a non-empty string."
        );
      });

      test('should fail when fusion-token is not a string', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return 12345;
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setFailed).toHaveBeenCalledWith(
          "Input 'fusion-token' must be a non-empty string."
        );
      });
    });

    describe('Token format validation', () => {
      test('should fail for token without BEARER prefix', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return 'abc123def456';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setFailed).toHaveBeenCalledWith(
          "Input 'fusion-token' is not in the correct format. It should start with 'BEARER ' followed by alphanumeric characters."
        );
      });

      test('should fail for token with wrong prefix case (bearer)', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return 'bearer abc123';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setFailed).toHaveBeenCalledWith(
          "Input 'fusion-token' is not in the correct format. It should start with 'BEARER ' followed by alphanumeric characters."
        );
      });

      test('should fail for token with wrong prefix (TOKEN)', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return 'TOKEN abc123';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setFailed).toHaveBeenCalledWith(
          "Input 'fusion-token' is not in the correct format. It should start with 'BEARER ' followed by alphanumeric characters."
        );
      });

      test('should fail for token starting with BEARER but no space', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return 'BEARERadc123';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setFailed).toHaveBeenCalledWith(
          "Input 'fusion-token' is not in the correct format. It should start with 'BEARER ' followed by alphanumeric characters."
        );
      });

      test('should pass for valid BEARER token format', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return 'BEARER abc123def456';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.info).toHaveBeenCalledWith('Fusion token validation passed.');
        expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', true);
        expect(mockCore.setFailed).not.toHaveBeenCalled();
      });

      test('should pass for BEARER token with mixed alphanumeric characters', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return 'BEARER A1b2C3d4E5f6G7h8I9j0';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', true);
        expect(mockCore.setFailed).not.toHaveBeenCalled();
      });

      test('should pass for BEARER token with uppercase letters', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return 'BEARER ABCDEFGHIJKLMNOP';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', true);
        expect(mockCore.setFailed).not.toHaveBeenCalled();
      });

      test('should pass for BEARER token with lowercase letters', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return 'BEARER abcdefghijklmnop';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', true);
        expect(mockCore.setFailed).not.toHaveBeenCalled();
      });

      test('should pass for BEARER token with numbers only', () => {
        mockCore.getInput.mockImplementation((input) => {
          if (input === 'fusion-token') return 'BEARER 1234567890';
          return '';
        });
        
        require('../scripts/validate-is-token-or-azure.js');
        
        expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', true);
        expect(mockCore.setFailed).not.toHaveBeenCalled();
      });
    });
  });

  describe('Priority and edge cases', () => {
    test('should validate fusion-token when both token and Azure credentials are provided', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'fusion-token') return 'BEARER validtoken123';
        if (input === 'azure-client-id') return 'client-id';
        if (input === 'azure-tenant-id') return 'tenant-id';
        if (input === 'azure-resource-id') return 'resource-id';
        return '';
      });
      
      require('../scripts/validate-is-token-or-azure.js');
      
      // When both are provided, it validates the token (doesn't skip to Azure)
      expect(mockCore.info).toHaveBeenCalledWith('Fusion token validation passed.');
      expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', true);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    test('should handle null values for Azure credentials', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'fusion-token') return 'BEARER validtoken123';
        if (input === 'azure-client-id') return null;
        if (input === 'azure-tenant-id') return null;
        if (input === 'azure-resource-id') return null;
        return '';
      });
      
      require('../scripts/validate-is-token-or-azure.js');
      
      expect(mockCore.info).toHaveBeenCalledWith('Fusion token validation passed.');
      expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', true);
    });

    test('should handle undefined values for Azure credentials', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'fusion-token') return 'BEARER validtoken123';
        return undefined;
      });
      
      require('../scripts/validate-is-token-or-azure.js');
      
      expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', true);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Complete validation flows', () => {
    test('should complete successful validation with fusion-token', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'fusion-token') return 'BEARER mySecretToken123';
        return '';
      });
      
      require('../scripts/validate-is-token-or-azure.js');
      
      // Verify all expected calls happened
      expect(mockCore.getInput).toHaveBeenCalledWith('fusion-token');
      expect(mockCore.getInput).toHaveBeenCalledWith('azure-client-id');
      expect(mockCore.getInput).toHaveBeenCalledWith('azure-tenant-id');
      expect(mockCore.getInput).toHaveBeenCalledWith('azure-resource-id');
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Fusion token validation passed.');
      expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', true);
    });

    test('should complete successful validation with Azure credentials', () => {
      mockCore.getInput.mockImplementation((input) => {
        if (input === 'fusion-token') return '';
        if (input === 'azure-client-id') return 'my-client';
        if (input === 'azure-tenant-id') return 'my-tenant';
        if (input === 'azure-resource-id') return 'my-resource';
        return '';
      });
      
      require('../scripts/validate-is-token-or-azure.js');
      
      expect(mockCore.setFailed).not.toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith(
        'Azure credentials provided, skipping fusion-token validation.'
      );
      expect(mockCore.setOutput).toHaveBeenCalledWith('isToken', false);
    });
  });
});