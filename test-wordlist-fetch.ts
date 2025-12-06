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
 * Fetch word list from bestwordlist.com based on exact position requirements
 */
async function fetchWordListByPosition(rules: WordleRules): Promise<string[]> {
  // Find the first exact position requirement to determine which page to fetch
  const exactPositions = Object.keys(rules.exact).map(k => parseInt(k));

  if (exactPositions.length === 0) {
    console.log("No exact position requirements found. Cannot determine which page to fetch.");
    return [];
  }

  // Use the first exact position (0-indexed internally, 1-indexed for URL)
  const position = exactPositions[0];
  const letter = rules.exact[position];
  const urlPosition = position + 1; // Convert to 1-indexed

  // Build URL based on observed pattern: https://www.bestwordlist.com/p/{letter}/1/words5lettersthirdletter{letter}.htm
  // The "1" appears to be a constant, and "third" is the ordinal position name
  const positionNames = ['first', 'second', 'third', 'fourth', 'fifth'];
  const positionName = positionNames[position] || `position${urlPosition}`;

  const url = `https://www.bestwordlist.com/p/${letter.toLowerCase()}/1/words${rules.length}letters${positionName}letter${letter.toLowerCase()}.htm`;

  console.log(`Fetching word list from: ${url}\n`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Extract words from the HTML
    // Words are formatted like: AB<b>O</b>DE (with the middle letter in bold)
    // They appear in spans with <span class=rd> for red (invalid in North America)
    // and <span class=gn> for green (valid only in North America)
    // Black (no span) means valid worldwide

    // Remove all <b> tags to get clean words
    const cleanHtml = html.replace(/<b>|<\/b>/g, '');

    // Extract words that are NOT in red spans (we want black and green words)
    // Pattern: Match sequences of 5 uppercase letters that are not inside <span class=rd>...</span>
    const wordRegex = /\b([A-Z]{5})\b/g;
    const redSpanRegex = /<span class=rd>(.*?)<\/span>/g;

    // First, remove all red spans
    const htmlWithoutRed = cleanHtml.replace(redSpanRegex, '');

    // Now extract all 5-letter words
    const matches = [];
    let match;
    while ((match = wordRegex.exec(htmlWithoutRed)) !== null) {
      const word = match[1];
      if (word.length === rules.length && /^[A-Z]+$/.test(word)) {
        matches.push(word);
      }
    }

    if (matches.length === 0) {
      console.log("No words found in the page.");
      return [];
    }

    // Remove duplicates
    const uniqueWords = Array.from(new Set(matches));

    console.log(`Found ${uniqueWords.length} unique ${rules.length}-letter words on the page (excluding red/invalid words).\n`);
    return uniqueWords;

  } catch (error: any) {
    console.error(`Error fetching word list: ${error.message}`);
    return [];
  }
}

/**
 * Main test function
 */
async function main() {
  console.log("=== Word List Fetching Prototype ===\n");

  // Test DSL rules
  const dslRules = `LENGTH: 5
O at 3
A in word
no S, T, R, E, C, L, U, D`;

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
  const validWords = allWords.filter(word => checkRules(word, rules));

  console.log(`Valid words found: ${validWords.length}\n`);

  if (validWords.length > 0) {
    console.log("Words that match all criteria:");
    validWords.forEach(word => console.log(`  ${word}`));
  } else {
    console.log("No words found matching all criteria.");
  }
}

main();
