import fs from 'node:fs'
import { execSync } from 'node:child_process'

const files = ['icon-192.png', 'icon-512.png']

for (const f of files) {
  const content = fs.readFileSync('D:/spss/app/dist/' + f).toString('base64')
  console.log('Uploading', f, '...')
  const payload = JSON.stringify({
    message: 'add ' + f + ' to gh-pages',
    content,
    branch: 'gh-pages',
  })
  fs.writeFileSync('D:/spss/app/tmp_payload.json', payload)
  execSync('gh api repos/chan-aji/spss-statistics/contents/' + f + ' -X PUT --input D:/spss/app/tmp_payload.json', { stdio: 'inherit' })
}
fs.unlinkSync('D:/spss/app/tmp_payload.json')
console.log('Done uploading icons!')
