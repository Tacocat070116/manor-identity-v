import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const files=fs.readdirSync('dist').filter(file=>file.endsWith('.js')).sort();
for(const file of files)execFileSync(process.execPath,['--check',path.join('dist',file)],{stdio:'inherit'});
console.log(`PASS: ${files.length}개 브라우저 모듈 문법 검사.`);
