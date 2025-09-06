/**
 * Build-time guardrail to prevent hardcoded Supabase URLs
 * This will fail the build if any supabase.co URLs are found in the source code
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SUPABASE_CO_REGEX = /supabase\.co/gi;
const EXCLUDED_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'buildGuard.ts', // Exclude this file itself
  '.md', // Exclude markdown files (changelogs, docs)
  '.json' // Exclude JSON files (package.json, etc.)
];

interface ViolationResult {
  file: string;
  line: number;
  content: string;
}

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern => filePath.includes(pattern));
}

function scanDirectory(dirPath: string): ViolationResult[] {
  const violations: ViolationResult[] = [];
  
  try {
    const items = readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);
      
      if (shouldExcludeFile(fullPath)) {
        continue;
      }
      
      if (stat.isDirectory()) {
        violations.push(...scanDirectory(fullPath));
      } else if (stat.isFile() && (
        fullPath.endsWith('.ts') || 
        fullPath.endsWith('.tsx') || 
        fullPath.endsWith('.js') || 
        fullPath.endsWith('.jsx')
      )) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            if (SUPABASE_CO_REGEX.test(line)) {
              violations.push({
                file: fullPath,
                line: index + 1,
                content: line.trim()
              });
            }
          });
        } catch (error) {
          console.warn(`Warning: Could not read file ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dirPath}:`, error);
  }
  
  return violations;
}

export function validateNoHardcodedSupabaseUrls(): void {
  console.log('🔍 Scanning for hardcoded supabase.co URLs...');
  
  const violations = scanDirectory('./src');
  
  if (violations.length > 0) {
    console.error('\n❌ BUILD FAILED: Hardcoded supabase.co URLs detected!');
    console.error('All Supabase calls must use the proxy: https://api.azyahstyle.com\n');
    
    violations.forEach(violation => {
      console.error(`  📁 ${violation.file}:${violation.line}`);
      console.error(`     ${violation.content}\n`);
    });
    
    console.error('Fix these violations by:');
    console.error('1. Using import.meta.env.VITE_SUPABASE_URL instead of hardcoded URLs');
    console.error('2. Using the supabase client methods instead of direct fetch calls');
    console.error('3. Ensuring all environment variables point to api.azyahstyle.com\n');
    
    process.exit(1);
  }
  
  console.log('✅ No hardcoded supabase.co URLs found. Build can proceed.');
}

// Run the validation if this file is executed directly
if (require.main === module) {
  validateNoHardcodedSupabaseUrls();
}