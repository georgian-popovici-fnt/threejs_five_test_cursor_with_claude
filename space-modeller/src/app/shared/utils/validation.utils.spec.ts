import {
  validateIfcFile,
  validateConfig,
  isValidUrl,
  isInRange,
  sanitizeFileName,
  isValidHexColor,
} from './validation.utils';

describe('Validation Utils', () => {
  describe('validateIfcFile', () => {
    it('should accept valid IFC file', () => {
      const file = new File(['content'], 'model.ifc', { type: 'application/ifc' });
      const result = validateIfcFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file without .ifc extension', () => {
      const file = new File(['content'], 'model.txt', { type: 'text/plain' });
      const result = validateIfcFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('.ifc extension');
    });

    it('should reject file that is too large', () => {
      const largeSize = 600 * 1024 * 1024; // 600MB
      const file = new File(['x'.repeat(largeSize)], 'large.ifc');
      const result = validateIfcFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should reject empty file', () => {
      const file = new File([], 'empty.ifc');
      const result = validateIfcFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject null file', () => {
      const result = validateIfcFile(null as any);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('should be case-insensitive for extension', () => {
      const file1 = new File(['content'], 'model.IFC', { type: 'application/ifc' });
      const file2 = new File(['content'], 'model.Ifc', { type: 'application/ifc' });
      
      expect(validateIfcFile(file1).valid).toBe(true);
      expect(validateIfcFile(file2).valid).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should validate complete configuration', () => {
      const config = {
        name: 'Test',
        value: 42,
        enabled: true,
      };
      
      const result = validateConfig(config, ['name', 'value', 'enabled']);
      
      expect(result.valid).toBe(true);
      expect(result.missing).toBeUndefined();
    });

    it('should detect missing required keys', () => {
      const config = {
        name: 'Test',
        value: 42,
      };
      
      const result = validateConfig(config, ['name', 'value', 'enabled']);
      
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['enabled']);
    });

    it('should detect multiple missing keys', () => {
      const config = {
        name: 'Test',
      };
      
      const result = validateConfig(config, ['name', 'value', 'enabled', 'type']);
      
      expect(result.valid).toBe(false);
      expect(result.missing?.length).toBe(3);
      expect(result.missing).toContain('value');
      expect(result.missing).toContain('enabled');
      expect(result.missing).toContain('type');
    });

    it('should treat null as missing', () => {
      const config = {
        name: 'Test',
        value: null,
      };
      
      const result = validateConfig(config, ['name', 'value']);
      
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('value');
    });

    it('should treat undefined as missing', () => {
      const config = {
        name: 'Test',
        value: undefined,
      };
      
      const result = validateConfig(config, ['name', 'value']);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should accept valid HTTP URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should accept valid HTTPS URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should accept URL with path', () => {
      expect(isValidUrl('https://example.com/path/to/resource')).toBe(true);
    });

    it('should accept URL with query parameters', () => {
      expect(isValidUrl('https://example.com?param=value')).toBe(true);
    });

    it('should reject invalid URL', () => {
      expect(isValidUrl('not a url')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });

    it('should reject malformed URL', () => {
      expect(isValidUrl('http://')).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('should return true for value within range', () => {
      expect(isInRange(5, 0, 10)).toBe(true);
    });

    it('should return true for value at minimum', () => {
      expect(isInRange(0, 0, 10)).toBe(true);
    });

    it('should return true for value at maximum', () => {
      expect(isInRange(10, 0, 10)).toBe(true);
    });

    it('should return false for value below minimum', () => {
      expect(isInRange(-1, 0, 10)).toBe(false);
    });

    it('should return false for value above maximum', () => {
      expect(isInRange(11, 0, 10)).toBe(false);
    });

    it('should handle negative ranges', () => {
      expect(isInRange(-5, -10, 0)).toBe(true);
      expect(isInRange(-11, -10, 0)).toBe(false);
    });

    it('should handle decimal values', () => {
      expect(isInRange(5.5, 0, 10)).toBe(true);
      expect(isInRange(10.1, 0, 10)).toBe(false);
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove path separators', () => {
      expect(sanitizeFileName('path/to/file.txt')).toBe('path_to_file.txt');
      expect(sanitizeFileName('path\\to\\file.txt')).toBe('path_to_file.txt');
    });

    it('should remove special characters', () => {
      expect(sanitizeFileName('file:name*.txt')).toBe('file_name_.txt');
      expect(sanitizeFileName('file<name>.txt')).toBe('file_name_.txt');
      expect(sanitizeFileName('file?name|.txt')).toBe('file_name_.txt');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFileName('my file name.txt')).toBe('my_file_name.txt');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeFileName('MyFileName.TXT')).toBe('myfilename.txt');
    });

    it('should handle empty string', () => {
      expect(sanitizeFileName('')).toBe('');
    });

    it('should handle already sanitized names', () => {
      const clean = 'clean_file_name.txt';
      expect(sanitizeFileName(clean)).toBe(clean);
    });
  });

  describe('isValidHexColor', () => {
    it('should accept valid hex colors', () => {
      expect(isValidHexColor('#000000')).toBe(true);
      expect(isValidHexColor('#FFFFFF')).toBe(true);
      expect(isValidHexColor('#ff0000')).toBe(true);
      expect(isValidHexColor('#00FF00')).toBe(true);
    });

    it('should reject colors without #', () => {
      expect(isValidHexColor('000000')).toBe(false);
    });

    it('should reject short hex colors', () => {
      expect(isValidHexColor('#000')).toBe(false);
      expect(isValidHexColor('#FFF')).toBe(false);
    });

    it('should reject long hex colors', () => {
      expect(isValidHexColor('#0000000')).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(isValidHexColor('#GGGGGG')).toBe(false);
      expect(isValidHexColor('#00ZZ00')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidHexColor('')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isValidHexColor('#AbCdEf')).toBe(true);
      expect(isValidHexColor('#abcdef')).toBe(true);
      expect(isValidHexColor('#ABCDEF')).toBe(true);
    });
  });
});

