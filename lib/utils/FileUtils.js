import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

export class FileUtils {
  static ensureDirectory(dirPath) {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  static readJSON(filePath) {
    try {
      return JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (error) {
      return null;
    }
  }

  static writeJSON(filePath, data) {
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}