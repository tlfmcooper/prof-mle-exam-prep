import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const publicDir = join(projectRoot, 'public');
const logoPath = join(publicDir, 'logo.svg');

console.log('🎨 Generating PWA icons from logo.svg...\n');

// Read the SVG file
const svgBuffer = readFileSync(logoPath);

// Generate regular icons
async function generateIcons() {
  try {
    // Generate icon-192.png
    console.log('⚙️  Generating icon-192.png...');
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(join(publicDir, 'icon-192.png'));
    console.log('✅ icon-192.png created\n');

    // Generate icon-512.png
    console.log('⚙️  Generating icon-512.png...');
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(join(publicDir, 'icon-512.png'));
    console.log('✅ icon-512.png created\n');

    // Generate apple-touch-icon.png (180x180)
    console.log('⚙️  Generating apple-touch-icon.png...');
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ apple-touch-icon.png created\n');

    // Generate maskable icons with padding
    console.log('⚙️  Generating icon-maskable-192.png...');
    await sharp(svgBuffer)
      .resize(154, 154) // 80% of 192 (20% padding)
      .extend({
        top: 19,
        bottom: 19,
        left: 19,
        right: 19,
        background: { r: 59, g: 130, b: 246, alpha: 1 } // Primary color #3b82f6
      })
      .png()
      .toFile(join(publicDir, 'icon-maskable-192.png'));
    console.log('✅ icon-maskable-192.png created\n');

    console.log('⚙️  Generating icon-maskable-512.png...');
    await sharp(svgBuffer)
      .resize(410, 410) // 80% of 512 (20% padding)
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 59, g: 130, b: 246, alpha: 1 } // Primary color #3b82f6
      })
      .png()
      .toFile(join(publicDir, 'icon-maskable-512.png'));
    console.log('✅ icon-maskable-512.png created\n');

    // Generate favicon sizes (16, 32, 48)
    console.log('⚙️  Generating favicon-16.png...');
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(join(publicDir, 'favicon-16.png'));
    console.log('✅ favicon-16.png created\n');

    console.log('⚙️  Generating favicon-32.png...');
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(join(publicDir, 'favicon-32.png'));
    console.log('✅ favicon-32.png created\n');

    console.log('⚙️  Generating favicon-48.png...');
    await sharp(svgBuffer)
      .resize(48, 48)
      .png()
      .toFile(join(publicDir, 'favicon-48.png'));
    console.log('✅ favicon-48.png created\n');

    // Note: favicon.ico should be created manually or with a separate tool
    // as Sharp doesn't support .ico format directly
    console.log('ℹ️  Note: Use an online converter to create favicon.ico from favicon-32.png');
    console.log('   Recommended: https://www.favicon-generator.org/\n');

    console.log('✅ All PWA icons generated successfully!');
    console.log('\n📁 Generated files:');
    console.log('   • icon-192.png (192x192)');
    console.log('   • icon-512.png (512x512)');
    console.log('   • apple-touch-icon.png (180x180)');
    console.log('   • icon-maskable-192.png (192x192 with padding)');
    console.log('   • icon-maskable-512.png (512x512 with padding)');
    console.log('   • favicon-16.png (16x16)');
    console.log('   • favicon-32.png (32x32)');
    console.log('   • favicon-48.png (48x48)');
    console.log('\n🎉 Ready to update manifest.json and index.html!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
