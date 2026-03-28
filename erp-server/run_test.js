const { execSync } = require('child_process');
try {
  execSync('npx ts-node src/index.ts', { stdio: 'pipe' });
  console.log('No error occurred.');
} catch(e) {
  console.log('--- STDOUT ---');
  console.log(e.stdout ? e.stdout.toString() : '');
  console.log('--- STDERR ---');
  console.log(e.stderr ? e.stderr.toString() : '');
}
