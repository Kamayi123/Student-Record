import fs from 'fs';
import path from 'path';
import { LOGS_DIR, ensureDirSync } from './utils.js';

function logLine(level, message) {
  try {
    ensureDirSync(LOGS_DIR);
    const line = `${new Date().toISOString()} [${level}] ${message}\n`;
    fs.appendFileSync(path.join(LOGS_DIR, 'app.log'), line, 'utf-8');
  } catch {
    // ignore logging failures
  }
}

export function logInfo(msg) { logLine('INFO', msg); }
export function logError(msg) { logLine('ERROR', msg); }
