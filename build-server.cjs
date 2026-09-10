const { build } = require('esbuild');

build({
  entryPoints: ['api/index.ts'],
  outfile: 'server.js',
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  external: [
    'mysql2',
    'express',
    'multer',
    'cors',
    'googleapis',
    'google-auth-library',
    'cloudinary',
    'mammoth',
    'xlsx',
    'fsevents'
  ]
}).then(() => {
  console.log('✓ server.js built successfully for production deployment');
}).catch((err) => {
  console.error('Error building server.js:', err);
  process.exit(1);
});
