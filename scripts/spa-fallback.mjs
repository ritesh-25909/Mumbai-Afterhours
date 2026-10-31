// GitHub Pages has no server-side routing. Serving index.html as 404.html makes deep links and refreshes work.
import { copyFileSync } from 'node:fs';
copyFileSync('dist/index.html', 'dist/404.html');
console.log('Wrote dist/404.html');
