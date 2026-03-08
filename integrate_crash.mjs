import fs from 'fs';
import path from 'path';

const srcBase = 'C:\\Users\\cheak\\Downloads\\crash-boost-bet-main\\crash-boost-bet-main';
const destBase = 'c:\\Users\\cheak\\Downloads\\Super-final-version-001-main\\Super-final-version-001-main';

// 1. Copy Files
const filesToCopy = [
  { src: 'src/components/CrashGraph.tsx', dest: 'client/src/components/CrashGraph.tsx' },
  { src: 'src/hooks/useCrashGame.ts', dest: 'client/src/hooks/useCrashGame.ts' },
  { src: 'src/hooks/useSoundEffects.ts', dest: 'client/src/hooks/useSoundEffects.ts' },
  { src: 'src/components/CrashGame.tsx', dest: 'client/src/pages/crash.tsx' }
];

for (const file of filesToCopy) {
  const srcPath = path.join(srcBase, file.src);
  const destPath = path.join(destBase, file.dest);
  
  if (fs.existsSync(srcPath)) {
    const content = fs.readFileSync(srcPath, 'utf8');
    // For CrashGame.tsx, we might want to make sure imports are fine. 
    // They import from @/components/CrashGraph and @/hooks/... which match our dest structure exactly because of the tsconfig alias.
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    
    // Slight tweak: if it's crash.tsx, maybe wrap it to show bottom nav?
    // Let's just copy exactly as requested.
    let finalContent = content;
    
    // Change ./CrashGraph to @/components/CrashGraph if it's CrashGame.tsx to be safe since it moved to pages/
    if (file.src === 'src/components/CrashGame.tsx') {
      finalContent = finalContent.replace('./CrashGraph', '@/components/CrashGraph');
    }
    
    fs.writeFileSync(destPath, finalContent, 'utf8');
    console.log(`✅ Copied ${file.src} to ${file.dest}`);
  } else {
    console.warn(`❌ Source file not found: ${srcPath}`);
  }
}

// 2. Update client/src/index.css
const cssDest = path.join(destBase, 'client/src/index.css');
let cssContent = fs.readFileSync(cssDest, 'utf8');

const additionalCss = `

/* --- CRASH GAME VARIABLES --- */
:root {
  --crash-green: 142 71% 45%;
  --crash-red: 0 84% 60%;
  --crash-gold: 45 93% 58%;
  --crash-surface: 222 35% 12%;
  --crash-surface-light: 220 30% 18%;
}

.dark {
  --crash-green: 142 71% 45%;
  --crash-red: 0 84% 60%;
  --crash-gold: 45 93% 58%;
  --crash-surface: 222 35% 12%;
  --crash-surface-light: 220 30% 18%;
}

/* --- CRASH GAME UTILITIES AND ANIMATIONS --- */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 12px 2px hsla(142, 71%, 45%, 0.3); }
  50% { box-shadow: 0 0 24px 6px hsla(142, 71%, 45%, 0.5); }
}

@keyframes float-rocket {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}

@keyframes crash-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}

@keyframes slide-in-badge {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.animate-pulse-glow {
  animation: pulse-glow 1.5s ease-in-out infinite;
}

.animate-float-rocket {
  animation: float-rocket 1.5s ease-in-out infinite;
}

.animate-crash-shake {
  animation: crash-shake 0.4s ease-out;
}

.animate-slide-badge {
  animation: slide-in-badge 0.3s ease-out;
}
`;

if (!cssContent.includes('--crash-green')) {
  fs.writeFileSync(cssDest, cssContent + additionalCss, 'utf8');
  console.log('✅ Injected Crash game CSS into index.css');
} else {
  console.log('ℹ️ Crash CSS already present in index.css');
}

console.log('Integration setup script finished.');
