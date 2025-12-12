#!/usr/bin/env node
/**
 * Prototype script to fetch words from bestwordlist.com and filter them
 */

interface WordleRules {
  exact: Record<number, string>;  // position -> letter (0-indexed)
  present: Record<string, number[]>;  // letter -> disallowed positions
  absent: string[];  // letters that must not appear
  length: number;
}

/**
 * Parse DSL rules into structured format
 */
function parseRules(dslRules: string): WordleRules {
  const rules: WordleRules = {
    exact: {},
    present: {},
    absent: [],
    length: 5,
  };

  const lines = dslRules.toUpperCase().split('\n').map(line => line.trim()).filter(line => line.length > 0);

  for (const line of lines) {
    // Exact Match: 'O AT 3'
    const exactMatch = line.match(/^([A-Z]) AT (\d)$/);
    if (exactMatch) {
      const position = parseInt(exactMatch[2], 10);
      if (position >= 1 && position <= 9) {
        rules.exact[position - 1] = exactMatch[1];
        continue;
      }
    }

    // Absent: 'NO S, T, R, E'
    const absentMatch = line.match(/^NO\s+([A-Z, ]+)$/);
    if (absentMatch) {
      const letters = absentMatch[1].split(',').map(l => l.trim()).filter(l => l.length === 1);
      rules.absent.push(...letters);
      continue;
    }

    // Present: 'A IN WORD'
    const presentMatch = line.match(/^([A-Z]) IN WORD/);
    if (presentMatch) {
      const letter = presentMatch[1];
      let disallowedPositions: number[] = [];

      const notAtMatch = line.match(/NOT AT ([\d, ]+)$/);
      if (notAtMatch) {
        disallowedPositions = notAtMatch[1].split(',')
          .map(p => parseInt(p.trim(), 10) - 1)
          .filter(p => p >= 0);
      }

      rules.present[letter] = disallowedPositions;
      continue;
    }

    // Length: 'LENGTH: 5'
    const lengthMatch = line.match(/^LENGTH:\s*(\d+)$/);
    if (lengthMatch) {
      rules.length = parseInt(lengthMatch[1], 10);
      continue;
    }
  }

  return rules;
}

/**
 * Check if a word satisfies the Wordle rules
 */
function checkRules(word: string, rules: WordleRules): boolean {
  word = word.toUpperCase();

  // Check length
  if (word.length !== rules.length) {
    return false;
  }

  // Check exact matches
  for (const indexStr in rules.exact) {
    const index = parseInt(indexStr);
    if (word[index] !== rules.exact[index]) {
      return false;
    }
  }

  // Check absent letters
  for (const letter of rules.absent) {
    if (word.includes(letter)) {
      return false;
    }
  }

  // Check present letters
  for (const letter in rules.present) {
    if (!word.includes(letter)) {
      return false;
    }

    const disallowedPositions = rules.present[letter];
    for (const index of disallowedPositions) {
      if (word[index] === letter) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a page has pagination and extract the next page number
 */
function getNextPageNumber(html: string): number | null {
  const nextPageMatch = html.match(/<link rel=next href=[^>]*page(\d+)\.htm>/);
  if (nextPageMatch) {
    return parseInt(nextPageMatch[1], 10);
  }
  return null;
}

/**
 * Fetch words from a specific URL with pagination support
 */
async function fetchWordsFromUrl(baseUrl: string, wordLength: number): Promise<string[]> {
  const allWords: string[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  // Extract base URL without .htm extension for building page URLs
  const baseUrlWithoutExt = baseUrl.replace(/\.htm$/, '');

  try {
    while (hasMorePages) {
      const pageUrl = currentPage === 1
        ? baseUrl
        : `${baseUrlWithoutExt}page${currentPage}.htm`;

      console.log(`    Page ${currentPage}: ${pageUrl}`);

      const response = await fetch(pageUrl);
      if (!response.ok) {
        if (response.status === 404 && currentPage > 1) {
          console.log(`    Page ${currentPage} not found. Finished pagination.`);
          break;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // Remove all <b> tags to get clean words
      const cleanHtml = html.replace(/<b>|<\/b>/g, '');

      // Remove all red spans (invalid words)
      const redSpanRegex = /<span class=rd>(.*?)<\/span>/g;
      const htmlWithoutRed = cleanHtml.replace(redSpanRegex, '');

      // Extract all words of the specified length
      const wordRegex = new RegExp(`\\b([A-Z]{${wordLength}})\\b`, 'g');
      const matches = [];
      let match;
      while ((match = wordRegex.exec(htmlWithoutRed)) !== null) {
        const word = match[1];
        if (word.length === wordLength && /^[A-Z]+$/.test(word)) {
          matches.push(word);
        }
      }

      allWords.push(...matches);
      console.log(`    Found ${matches.length} words on page ${currentPage}`);

      // Check for next page
      const nextPageNum = getNextPageNumber(html);
      if (nextPageNum && nextPageNum === currentPage + 1) {
        currentPage = nextPageNum;
        // Small delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        hasMorePages = false;
      }
    }

    return allWords;

  } catch (error: any) {
    console.error(`  Error fetching from ${baseUrl}: ${error.message}`);
    return [];
  }
}

/**
 * Calculate allowed positions for a "present" letter based on disallowed positions
 */
function getAllowedPositions(wordLength: number, disallowedPositions: number[]): number[] {
  const allPositions = Array.from({ length: wordLength }, (_, i) => i);
  return allPositions.filter(pos => !disallowedPositions.includes(pos));
}

/**
 * Fetch word list from bestwordlist.com based on exact or present position requirements
 */
async function fetchWordListByPosition(rules: WordleRules): Promise<string[]> {
  const positionNames = ['first', 'second', 'third', 'fourth', 'fifth'];
  const allWords: string[] = [];

  // Strategy 1: If there are exact position requirements, use them
  const exactPositions = Object.keys(rules.exact).map(k => parseInt(k));

  if (exactPositions.length > 0) {
    console.log("Found exact position constraints. Using first exact position.\n");

    const position = exactPositions[0];
    const letter = rules.exact[position];
    const positionName = positionNames[position] || `position${position + 1}`;

    const url = `https://www.bestwordlist.com/p/${letter.toLowerCase()}/1/words${rules.length}letters${positionName}letter${letter.toLowerCase()}.htm`;

    const words = await fetchWordsFromUrl(url, rules.length);
    allWords.push(...words);

    console.log(`  Found ${words.length} words with ${letter} at position ${position + 1}\n`);

  } else {
    // Strategy 2: No exact positions - use "present" constraints
    console.log("No exact position constraints found.");
    console.log("Finding best 'present' constraint to use for fetching...\n");

    // Find the "present" letter with the fewest allowed positions
    let bestLetter: string | null = null;
    let bestAllowedPositions: number[] = [];
    let minPositionCount = Infinity;

    for (const letter in rules.present) {
      const disallowedPositions = rules.present[letter];
      const allowedPositions = getAllowedPositions(rules.length, disallowedPositions);

      console.log(`  Letter ${letter}:`);
      console.log(`    Disallowed at: ${disallowedPositions.map(p => p + 1).join(', ') || 'none'}`);
      console.log(`    Allowed at: ${allowedPositions.map(p => p + 1).join(', ')}`);
      console.log(`    Total allowed positions: ${allowedPositions.length}`);

      if (allowedPositions.length < minPositionCount && allowedPositions.length > 0) {
        minPositionCount = allowedPositions.length;
        bestLetter = letter;
        bestAllowedPositions = allowedPositions;
      }
    }

    if (!bestLetter || bestAllowedPositions.length === 0) {
      console.log("\nNo valid 'present' constraints found to use for fetching.");
      return [];
    }

    console.log(`\nSelected letter: ${bestLetter} (${bestAllowedPositions.length} allowed positions)`);
    console.log(`Will fetch words with ${bestLetter} at positions: ${bestAllowedPositions.map(p => p + 1).join(', ')}\n`);

    // Fetch words for each allowed position
    for (const position of bestAllowedPositions) {
      const positionName = positionNames[position] || `position${position + 1}`;
      const url = `https://www.bestwordlist.com/p/${bestLetter.toLowerCase()}/1/words${rules.length}letters${positionName}letter${bestLetter.toLowerCase()}.htm`;

      const words = await fetchWordsFromUrl(url, rules.length);
      allWords.push(...words);

      console.log(`  Found ${words.length} words with ${bestLetter} at position ${position + 1}`);
    }

    console.log();
  }

  // Remove duplicates
  const uniqueWords = Array.from(new Set(allWords));
  console.log(`Total unique words fetched: ${uniqueWords.length}\n`);

  return uniqueWords;
}

/**
 * Main test function
 */
async function main() {
  console.log("=== Word List Fetching Prototype ===\n");

  // Test DSL rules - using your example with only present constraints
  const dslRules = `A in word, not at 1, 2, 3
T in word, not at 2, 4
no C, D, E, L, O, R, S, U, Y
LENGTH: 5`;

  console.log("DSL Rules:");
  console.log(dslRules);
  console.log();

  const rules = parseRules(dslRules);
  console.log("Parsed Rules:");
  console.log(JSON.stringify(rules, null, 2));
  console.log();

  // Fetch word list
  const allWords = await fetchWordListByPosition(rules);

  // Filter words based on all rules
  console.log("=== Filtering Words ===\n");

  // Debug: Show some sample words before filtering
  console.log("Sample words fetched (first 10):");
  allWords.slice(0, 10).forEach(word => console.log(`  ${word}`));
  console.log();

  // Debug: Check how many have T
  const wordsWithT = allWords.filter(w => w.includes('T'));
  console.log(`Words with T: ${wordsWithT.length} out of ${allWords.length}`);
  if (wordsWithT.length > 0) {
    console.log("Sample words with T:");
    wordsWithT.slice(0, 10).forEach(word => console.log(`  ${word}`));
  }
  console.log();

  const validWords = allWords.filter(word => checkRules(word, rules));

  console.log(`Valid words found: ${validWords.length}\n`);

  if (validWords.length > 0) {
    console.log("Words that match all criteria:");
    validWords.forEach(word => console.log(`  ${word}`));
  } else {
    console.log("No words found matching all criteria.");

    // Debug: Check a few words manually
    console.log("\nDebug: Checking why words failed...");
    const sampleWords = allWords.slice(0, 5);
    for (const word of sampleWords) {
      console.log(`\nChecking word: ${word}`);
      console.log(`  Has T? ${word.includes('T')}`);
      console.log(`  T positions in word: ${[...word].map((c, i) => c === 'T' ? i + 1 : null).filter(x => x !== null).join(', ') || 'none'}`);
      console.log(`  T disallowed positions (1-indexed): ${rules.present['T'].map(p => p + 1).join(', ')}`);
      console.log(`  Result: ${checkRules(word, rules) ? 'PASS' : 'FAIL'}`);
    }
  }
}

main();
