// Quick test to check if words appear on both pages

async function fetchWordsWithPattern(letter: string, position: number): Promise<string[]> {
  const positionNames = ['first', 'second', 'third', 'fourth', 'fifth'];
  const positionName = positionNames[position];
  const url = `https://www.bestwordlist.com/p/${letter.toLowerCase()}/1/words5letters${positionName}letter${letter.toLowerCase()}.htm`;

  console.log(`Fetching: ${url}`);
  const response = await fetch(url);
  const html = await response.text();
  const cleanHtml = html.replace(/<b>|<\/b>/g, '');
  const redSpanRegex = /<span class=rd>(.*?)<\/span>/g;
  const htmlWithoutRed = cleanHtml.replace(redSpanRegex, '');

  const wordRegex = /\b([A-Z]{5})\b/g;
  const matches = [];
  let match;
  while ((match = wordRegex.exec(htmlWithoutRed)) !== null) {
    matches.push(match[1]);
  }
  return Array.from(new Set(matches));
}

async function main() {
  // Get words with O at position 3 (0-indexed position 2)
  const wordsWithO = await fetchWordsWithPattern('O', 2);
  console.log(`Words with O at position 3: ${wordsWithO.length}\n`);

  // Get words with A at position 1 (0-indexed position 0)
  const wordsWithA = await fetchWordsWithPattern('A', 0);
  console.log(`Words with A at position 1: ${wordsWithA.length}\n`);

  // Find intersection (words with both A at 1 AND O at 3)
  const intersection1 = wordsWithO.filter(word =>
    word[0] === 'A' && word[2] === 'O'
  );
  console.log(`Words with A at position 1 from O-at-3 page: ${intersection1.length}`);
  console.log(intersection1.slice(0, 10).join(', '));

  const intersection2 = wordsWithA.filter(word =>
    word[0] === 'A' && word[2] === 'O'
  );
  console.log(`\nWords with O at position 3 from A-at-1 page: ${intersection2.length}`);
  console.log(intersection2.slice(0, 10).join(', '));

  // Check if they match
  const sorted1 = intersection1.sort();
  const sorted2 = intersection2.sort();
  const match = JSON.stringify(sorted1) === JSON.stringify(sorted2);
  console.log(`\n${match ? '✓' : '❌'} Both pages have the same intersection: ${match}`);

  if (!match) {
    console.log("\n❌ MISMATCH - Words only on O-at-3 page:");
    sorted1.filter(w => !sorted2.includes(w)).forEach(w => console.log(`  ${w}`));
    console.log("\n❌ MISMATCH - Words only on A-at-1 page:");
    sorted2.filter(w => !sorted1.includes(w)).forEach(w => console.log(`  ${w}`));
  }
}

main();
