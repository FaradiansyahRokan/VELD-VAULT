const fs = require('fs');
const files = [
  'd:/BELAJAR/BLOCKCHAIN/cipher-vault/client/src/app/dashboard/page.tsx',
  'd:/BELAJAR/BLOCKCHAIN/cipher-vault/client/src/app/vault/page.tsx',
  'd:/BELAJAR/BLOCKCHAIN/cipher-vault/client/src/app/market/page.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  // 1. bg-white dark:bg-[#0D1B4D] -> bg-card
  c = c.replace(/bg-white\s+dark:bg-\[\#0[Dd]1[Bb]4[Dd]\]/g, 'bg-card');
  
  // 2. bg-slate-50 dark:bg-[#091540] -> bg-background
  c = c.replace(/bg-slate-50\s+dark:bg-\[\#091540\]/g, 'bg-background');
  
  // 3. border-slate-* dark:border-[#ABD2FA]/* -> border-border
  c = c.replace(/border-slate-\d+(?:\/\d+)?\s+dark:border-\[\#[Aa][Bb][Dd]2[Ff][Aa]\](?:\/\d+)?/g, 'border-border');
  
  // 4. bg-slate-100 dark:bg-[#091540] (or #0B1742) -> bg-muted
  c = c.replace(/bg-slate-100\s+dark:bg-\[\#(091540|0[Bb]1742)\]/g, 'bg-muted');
  // bg-black/[0.02] dark:bg-white/[0.04] -> bg-muted
  c = c.replace(/bg-black\/\[0\.02\]\s+dark:bg-white\/\[0\.04\]/g, 'bg-muted');
  
  // 5. text-[#091540] dark:text-[#F4F8FC] -> text-foreground
  c = c.replace(/text-\[\#091540\]\s+dark:text-\[\#F4F8FC\]/g, 'text-foreground');
  
  // 6. bg-[#1B2CC1] -> bg-primary
  c = c.replace(/bg-\[\#1B2CC1\]/g, 'bg-primary');
  
  // 7. text-white (when on primary bg) -> text-primary-foreground
  c = c.replace(/className="([^"]*)"/g, (match, classes) => {
    if (classes.includes('bg-primary') && classes.includes('text-white')) {
      return 'className="' + classes.replace(/\btext-white\b/g, 'text-primary-foreground') + '"';
    }
    return match;
  });

  // 8. Fix bugs where dark colors like bg-[#091540] or bg-[#0D1B4D] or bg-black/* were used WITHOUT a dark: prefix
  c = c.replace(/(?<!dark:)bg-\[\#091540\]/g, 'bg-background');
  c = c.replace(/(?<!dark:)bg-\[\#0[Dd]1[Bb]4[Dd]\]/g, 'bg-card');
  c = c.replace(/(?<!dark:)bg-black\/\S+/g, 'bg-muted');
  
  fs.writeFileSync(f, c);
});
console.log('Done');
