/**
 * Validation utility functions
 */

/**
 * Validate if a file is a valid IFC file
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export function validateIfcFile(file: File): { valid: boolean; error?: string } {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.ifc')) {
    return { valid: false, error: 'File must have .ifc extension' };
  }

  // Check file size (default max 500MB)
  const maxSize = 500 * 1024 * 1024; // 500 MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.floor(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Check file size is not zero
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
}

/**
 * Validate configuration object
 * @param config - Configuration to validate
 * @param required - Required keys
 * @returns Validation result
 */
export function validateConfig<T extends Record<string, any>>(
  config: T,
  required: (keyof T)[]
): { valid: boolean; missing?: (keyof T)[] } {
  const missing = required.filter((key) => {
    return config[key] === undefined || config[key] === null;
  });

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

/**
 * Validate URL
 * @param url - URL to validate
 * @returns True if valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate number is within range
 * @param value - Value to check
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns True if valid
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Sanitize file name
 * @param fileName - File name to sanitize
 * @returns Sanitized file name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators and special characters
  return fileName
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

/**
 * Validate color hex string
 * @param color - Color string to validate
 * @returns True if valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

