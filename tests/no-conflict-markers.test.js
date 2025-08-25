const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function fileHasMarkers(path) {
  const content = fs.readFileSync(path, 'utf8');
  return ['<<<<<<<', '=======', '>>>>>>>'].some(marker => content.includes(marker));
}

test('fetchCardImages.js has no merge conflict markers', () => {
  assert.equal(fileHasMarkers('fetchCardImages.js'), false);
});
