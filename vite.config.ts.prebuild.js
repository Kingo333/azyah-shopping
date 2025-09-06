#!/usr/bin/env node

/**
 * Pre-build validation script to ensure no hardcoded Supabase URLs
 * This runs before Vite builds the project
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_CO_REGEX = /supabase\.co/gi;
const EXCLUDED_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'prebuild.js',
  '.md',
  '.json',
  'types.ts' // Exclude auto-generated Supabase types
];

function shouldExcludeFile(filePath) {
  return EXCLUDED_PATTERNS.some(pattern => filePath.includes(pattern));
}

function scanDirectory(dirPath, violations = []) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (shouldExcludeFile(fullPath)) {
        continue;
      }
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, violations);
      } else if (stat.isFile() && (
        fullPath.endsWith('.ts') || 
        fullPath.endsWith('.tsx') || 
        fullPath.endsWith('.js') || 
        fullPath.endsWith('.jsx')
      )) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
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
          console.warn(`Warning: Could not read file ${fullPath}`);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dirPath}`);
  }
  
  return violations;
}

function main() {
  console.log('🔍 Pre-build: Scanning for hardcoded supabase.co URLs...');
  
  const violations = scanDirectory('./src');
  
  if (violations.length > 0) {
    console.error('\n❌ BUILD BLOCKED: Hardcoded supabase.co URLs detected!');
    console.error('All Supabase calls must use: https://api.azyahstyle.com\n');
    
    violations.forEach(violation => {
      console.error(`  📁 ${violation.file}:${violation.line}`);
      console.error(`     ${violation.content}\n`);
    });
    
    console.error('Fix these by:');
    console.error('1. Using import.meta.env.VITE_SUPABASE_URL');
    console.error('2. Using supabase client methods instead of direct fetch');
    console.error('3. Ensuring all env vars point to api.azyahstyle.com\n');
    
    process.exit(1);
  }
  
  console.log('✅ Pre-build validation passed - no hardcoded URLs found');
}

if (require.main === module) {
  main();
}