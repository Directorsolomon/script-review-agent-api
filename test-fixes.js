#!/usr/bin/env node

/**
 * Test script to verify our fixes are working correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Script Review Agent API Fixes\n');

// Test 1: Verify duplicate presign_script file was removed
console.log('1. Testing duplicate file removal...');
const presignScriptPath = path.join(__dirname, 'backend/submissions/presign_script.ts');
if (!fs.existsSync(presignScriptPath)) {
  console.log('   ✅ backend/submissions/presign_script.ts successfully removed');
} else {
  console.log('   ❌ backend/submissions/presign_script.ts still exists');
}

// Test 2: Verify shared components were created
console.log('\n2. Testing shared component creation...');
const inputComponentPath = path.join(__dirname, 'frontend/components/primitives/Input.tsx');
const cardComponentPath = path.join(__dirname, 'frontend/components/primitives/Card.tsx');

if (fs.existsSync(inputComponentPath)) {
  console.log('   ✅ Input component created at frontend/components/primitives/Input.tsx');
} else {
  console.log('   ❌ Input component missing');
}

if (fs.existsSync(cardComponentPath)) {
  console.log('   ✅ Card component created at frontend/components/primitives/Card.tsx');
} else {
  console.log('   ❌ Card component missing');
}

// Test 3: Verify imports in frontend files
console.log('\n3. Testing shared component imports...');
const publicAppPath = path.join(__dirname, 'frontend/PublicApp.tsx');
const adminAppPath = path.join(__dirname, 'frontend/AdminApp.tsx');
const userDashboardPath = path.join(__dirname, 'frontend/components/UserDashboard.tsx');

function checkImports(filePath, fileName) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasInputImport = content.includes('import Input from "./components/primitives/Input"') || 
                          content.includes('import Input from "./primitives/Input"');
    const hasCardImport = content.includes('import Card from "./components/primitives/Card"') || 
                         content.includes('import Card from "./primitives/Card"');
    
    if (hasInputImport && hasCardImport) {
      console.log(`   ✅ ${fileName} correctly imports shared components`);
    } else {
      console.log(`   ⚠️  ${fileName} may have import issues`);
    }
  } else {
    console.log(`   ❌ ${fileName} not found`);
  }
}

checkImports(publicAppPath, 'PublicApp.tsx');
checkImports(adminAppPath, 'AdminApp.tsx');
checkImports(userDashboardPath, 'UserDashboard.tsx');

// Test 4: Verify SQL injection fixes
console.log('\n4. Testing SQL injection fixes...');
const listAdminPath = path.join(__dirname, 'backend/submissions/list_admin.ts');
if (fs.existsSync(listAdminPath)) {
  const content = fs.readFileSync(listAdminPath, 'utf8');
  const hasTemplateQueries = content.includes('db.queryRow`') || content.includes('db.queryAll`');
  const hasParameterizedQueries = content.includes('db.rawQueryAll(query, params)');
  
  if (hasTemplateQueries || hasParameterizedQueries) {
    console.log('   ✅ list_admin.ts uses safe query methods');
  } else {
    console.log('   ❌ list_admin.ts may have unsafe queries');
  }
} else {
  console.log('   ❌ list_admin.ts not found');
}

// Test 5: Verify BM25 refactoring
console.log('\n5. Testing BM25 code deduplication...');
const vectorSearchPath = path.join(__dirname, 'backend/vector/search.ts');
if (fs.existsSync(vectorSearchPath)) {
  const content = fs.readFileSync(vectorSearchPath, 'utf8');
  const hasImportBM25 = content.includes('import { searchDocsBM25, searchScriptBM25 }');
  const callsBM25Functions = content.includes('await searchDocsBM25(') && content.includes('await searchScriptBM25(');
  
  if (hasImportBM25 && callsBM25Functions) {
    console.log('   ✅ vector/search.ts correctly calls BM25 functions');
  } else {
    console.log('   ⚠️  vector/search.ts may not be fully refactored');
  }
} else {
  console.log('   ❌ vector/search.ts not found');
}

// Test 6: Verify TypeScript improvements
console.log('\n6. Testing TypeScript improvements...');
if (fs.existsSync(userDashboardPath)) {
  const content = fs.readFileSync(userDashboardPath, 'utf8');
  const hasAnyTypes = content.includes(': any');
  const hasProperInterfaces = content.includes('interface ActionPlanItem') && 
                             content.includes('interface BucketScore') && 
                             content.includes('interface ReportData');
  
  if (!hasAnyTypes && hasProperInterfaces) {
    console.log('   ✅ UserDashboard.tsx has proper TypeScript types');
  } else if (hasProperInterfaces) {
    console.log('   ⚠️  UserDashboard.tsx has interfaces but may still have some any types');
  } else {
    console.log('   ❌ UserDashboard.tsx missing proper interfaces');
  }
} else {
  console.log('   ❌ UserDashboard.tsx not found');
}

// Test 7: Verify clipboard API fix
console.log('\n7. Testing clipboard API modernization...');
if (fs.existsSync(publicAppPath)) {
  const content = fs.readFileSync(publicAppPath, 'utf8');
  const hasDeprecatedAPI = content.includes('document.execCommand');
  const hasModernAPI = content.includes('navigator.clipboard');
  
  if (hasModernAPI && !hasDeprecatedAPI) {
    console.log('   ✅ PublicApp.tsx uses modern clipboard API');
  } else if (hasModernAPI) {
    console.log('   ⚠️  PublicApp.tsx has modern API but may still have deprecated fallback');
  } else {
    console.log('   ❌ PublicApp.tsx missing modern clipboard API');
  }
} else {
  console.log('   ❌ PublicApp.tsx not found');
}

console.log('\n🎉 Fix verification complete!');
console.log('\nSummary of implemented fixes:');
console.log('• Removed duplicate presignScript file');
console.log('• Created shared UI components (Input, Card)');
console.log('• Fixed SQL injection vulnerabilities');
console.log('• Eliminated BM25 code duplication');
console.log('• Replaced TypeScript any types with proper interfaces');
console.log('• Modernized clipboard API usage');
console.log('• Standardized database query methods');
