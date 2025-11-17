import sharp from 'sharp';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const publicDir = join(projectRoot, 'public');

console.log('🔍 Validating PWA icons...\n');

const expectedIcons = [
  { file: 'logo.svg', type: 'svg', description: 'Main logo SVG' },
  { file: 'icon-192.png', width: 192, height: 192, description: 'PWA icon 192x192' },
  { file: 'icon-512.png', width: 512, height: 512, description: 'PWA icon 512x512' },
  { file: 'apple-touch-icon.png', width: 180, height: 180, description: 'Apple touch icon' },
  { file: 'icon-maskable-192.png', width: 192, height: 192, description: 'Maskable icon 192x192' },
  { file: 'icon-maskable-512.png', width: 512, height: 512, description: 'Maskable icon 512x512' },
  { file: 'favicon-16.png', width: 16, height: 16, description: 'Favicon 16x16' },
  { file: 'favicon-32.png', width: 32, height: 32, description: 'Favicon 32x32' },
  { file: 'favicon-48.png', width: 48, height: 48, description: 'Favicon 48x48' },
];

let errors = 0;
let warnings = 0;
let passed = 0;

async function validateIcons() {
  for (const icon of expectedIcons) {
    const filePath = join(publicDir, icon.file);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.log(`❌ ${icon.description}: File not found`);
      console.log(`   Path: ${filePath}\n`);
      errors++;
      continue;
    }

    // Check SVG file
    if (icon.type === 'svg') {
      try {
        const svgContent = readFileSync(filePath, 'utf-8');
        if (svgContent.includes('<svg') && svgContent.includes('</svg>')) {
          console.log(`✅ ${icon.description}: Valid SVG file`);
          passed++;
        } else {
          console.log(`❌ ${icon.description}: Invalid SVG format`);
          errors++;
        }
      } catch (error) {
        console.log(`❌ ${icon.description}: Error reading file - ${error.message}`);
        errors++;
      }
      console.log('');
      continue;
    }

    // Check PNG dimensions
    try {
      const metadata = await sharp(filePath).metadata();

      if (metadata.width === icon.width && metadata.height === icon.height) {
        console.log(`✅ ${icon.description}: ${metadata.width}x${metadata.height} ✓`);
        passed++;
      } else {
        console.log(`❌ ${icon.description}: Expected ${icon.width}x${icon.height}, got ${metadata.width}x${metadata.height}`);
        errors++;
      }

      // Check file format
      if (metadata.format !== 'png') {
        console.log(`   ⚠️  Warning: Expected PNG, got ${metadata.format}`);
        warnings++;
      }

      // Check for transparency (should have alpha channel for proper PWA icons)
      if (!metadata.hasAlpha) {
        console.log(`   ℹ️  Note: No alpha channel (transparency)`);
      }

    } catch (error) {
      console.log(`❌ ${icon.description}: Error processing file - ${error.message}`);
      errors++;
    }

    console.log('');
  }

  // Check manifest.json
  const manifestPath = join(publicDir, 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      console.log(`✅ manifest.json: Valid JSON`);
      console.log(`   Name: ${manifest.name}`);
      console.log(`   Icons: ${manifest.icons?.length || 0} defined`);
      console.log(`   Theme color: ${manifest.theme_color}`);
      passed++;
    } catch (error) {
      console.log(`❌ manifest.json: Invalid JSON - ${error.message}`);
      errors++;
    }
  } else {
    console.log(`❌ manifest.json: File not found`);
    errors++;
  }
  console.log('');

  // Check index.html for PWA meta tags
  const indexPath = join(projectRoot, 'index.html');
  if (existsSync(indexPath)) {
    const indexContent = readFileSync(indexPath, 'utf-8');
    const checks = [
      { tag: 'manifest', present: indexContent.includes('manifest.json'), desc: 'Manifest link' },
      { tag: 'apple-touch-icon', present: indexContent.includes('apple-touch-icon'), desc: 'Apple touch icon' },
      { tag: 'theme-color', present: indexContent.includes('theme-color'), desc: 'Theme color meta' },
    ];

    console.log('index.html PWA configuration:');
    checks.forEach(check => {
      if (check.present) {
        console.log(`   ✅ ${check.desc}`);
        passed++;
      } else {
        console.log(`   ❌ ${check.desc}`);
        errors++;
      }
    });
  } else {
    console.log(`❌ index.html: File not found`);
    errors++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  if (warnings > 0) console.log(`⚠️  Warnings: ${warnings}`);
  if (errors > 0) console.log(`❌ Errors: ${errors}`);
  console.log('='.repeat(50) + '\n');

  if (errors === 0) {
    console.log('🎉 All validations passed! Your PWA icons are ready to use.');
    process.exit(0);
  } else {
    console.log('⚠️  Some validations failed. Please fix the errors above.');
    process.exit(1);
  }
}

validateIcons();
