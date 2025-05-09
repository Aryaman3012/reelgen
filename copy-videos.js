const fs = require('fs-extra');
const path = require('path');

const srcDir = path.join(__dirname, 'input_videos');
const destDir = path.join(__dirname, 'dist', 'input_videos');

fs.copySync(srcDir, destDir);
console.log('Copied input_videos to dist/input_videos'); 