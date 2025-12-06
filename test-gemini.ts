#!/usr/bin/env node
/**
 * Test script to replicate the Gemini API calling logic from the HTML file.
 * This helps diagnose why the Gemini API call is not returning.
 */

import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
  };
}

interface DslResult {
  dsl_rules: string;
}

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const GEMINI_TIMEOUT_MS = 20000;
const DICT_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

// Cache to store known valid words to avoid repeated API calls
const WORD_CACHE: Record<string, boolean> = {};

/**
 * Core logic to handle the Gemini API call with exponential backoff and a hard timeout.
 * This is a direct port from the HTML file (lines 149-206).
 */
async function handleGeminiApiCall(
  apiKey: string,
  payload: any,
  maxRetries: number = 5,
  delay: number = 1000
): Promise<GeminiResponse> {
  console.log("Starting Gemini API call...");
  const fullApiUrl = `${GEMINI_API_URL}?key=${apiKey}`;

  if (!apiKey) {
    throw new Error("API Key is required.");
  }

  for (let i = 0; i < maxRetries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`Timeout reached (${GEMINI_TIMEOUT_MS}ms), aborting request...`);
      controller.abort();
    }, GEMINI_TIMEOUT_MS);

    try {
      console.log(`Attempt ${i + 1}/${maxRetries}: Sending request to Gemini API...`);

      const response = await fetch(fullApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`Gemini API response received. Status: ${response.status}`);

      if (response.ok) {
        return await response.json();
      } else if (response.status === 429 && i < maxRetries - 1) {
        console.warn(`Gemini API Rate Limit Hit. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        let errorBody: any = {};
        try {
          errorBody = await response.json();
        } catch (e) {
          console.error(
            "Failed to parse error response body as JSON. Response may be plain text or HTML error.",
            e
          );
        }
        throw new Error(
          `Gemini API call failed with status: ${response.status}. Message: ${
            errorBody.error?.message || response.statusText
          }. Check the console for more details.`
        );
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        error = new Error(`Gemini API call timed out after ${GEMINI_TIMEOUT_MS / 1000} seconds.`);
      }

      if (i === maxRetries - 1) {
        console.error("Final Gemini API call attempt failed.", error);
        throw error;
      }
      console.warn(`Gemini API Request failed: ${error.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error("Failed to complete Gemini API call after all retries.");
}

/**
 * Uses an external API to check if a word is a valid dictionary entry.
 * This is a direct port from the HTML file (lines 213-252).
 */
async function validateWordExistence(word: string, requiredLength: number): Promise<boolean> {
  word = word.toLowerCase();
  const cacheKey = `${word}:${requiredLength}`;

  if (WORD_CACHE[cacheKey] !== undefined) {
    return WORD_CACHE[cacheKey];
  }

  // Skip API call if length doesn't match the expectation based on DSL rules
  if (word.length !== requiredLength) {
    WORD_CACHE[cacheKey] = false;
    return false;
  }

  try {
    // Call the external dictionary API
    const response = await fetch(DICT_API_URL + word);

    if (response.ok) {
      // Success (word found). We don't need to parse the definitions, just confirm existence.
      WORD_CACHE[cacheKey] = true;
      return true;
    } else if (response.status === 404) {
      // Word not found in the dictionary
      WORD_CACHE[cacheKey] = false;
      return false;
    } else {
      // Other API errors (rate limit, server error, etc.)
      console.error(`Dictionary API failed for word "${word}" with status: ${response.status}`);
      // Fallback: assume the word is valid to avoid false negatives due to a failed check
      WORD_CACHE[cacheKey] = true;
      return true;
    }
  } catch (error) {
    console.error(`Network error during dictionary check for "${word}":`, error);
    // Fallback: assume the word is valid if the external check fails
    WORD_CACHE[cacheKey] = true;
    return true;
  }
}

/**
 * Parse DSL rules into structured format
 */
function parseRules(dslRules: string): any {
  const rules: any = {
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
      const letters = absentMatch[1].split(',').map((l: string) => l.trim()).filter((l: string) => l.length === 1);
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
function checkRules(word: string, rules: any): boolean {
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
 * Extract words from a page's HTML
 */
function extractWordsFromHtml(html: string, wordLength: number): string[] {
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

  return matches;
}

/**
 * Check if a page has pagination and extract the next page number
 */
function getNextPageNumber(html: string): number | null {
  // Look for pagination links like: <a class=pg href=words5lettersfirstletterapage2.htm>2</a>
  const nextPageMatch = html.match(/<link rel=next href=[^>]*page(\d+)\.htm>/);
  if (nextPageMatch) {
    return parseInt(nextPageMatch[1], 10);
  }
  return null;
}

/**
 * Fetch word list from bestwordlist.com based on exact position requirements
 * Handles pagination to fetch all words across multiple pages
 */
async function fetchWordListByPosition(rules: any): Promise<string[]> {
  const exactPositions = Object.keys(rules.exact).map(k => parseInt(k));

  if (exactPositions.length === 0) {
    console.log("No exact position requirements found. Cannot fetch from bestwordlist.com.");
    return [];
  }

  const position = exactPositions[0];
  const letter = rules.exact[position];

  const positionNames = ['first', 'second', 'third', 'fourth', 'fifth'];
  const positionName = positionNames[position] || `position${position + 1}`;

  // Base URL pattern for page 1
  const baseUrl = `https://www.bestwordlist.com/p/${letter.toLowerCase()}/1/words${rules.length}letters${positionName}letter${letter.toLowerCase()}`;
  const page1Url = `${baseUrl}.htm`;

  console.log(`Fetching word list from: ${page1Url}\n`);

  const allWords: string[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  try {
    while (hasMorePages) {
      const pageUrl = currentPage === 1
        ? page1Url
        : `${baseUrl}page${currentPage}.htm`;

      console.log(`Fetching page ${currentPage}: ${pageUrl}`);

      const response = await fetch(pageUrl);
      if (!response.ok) {
        if (response.status === 404 && currentPage > 1) {
          // No more pages
          console.log(`Page ${currentPage} not found. Finished pagination.\n`);
          break;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // Extract words from this page
      const pageWords = extractWordsFromHtml(html, rules.length);
      console.log(`  Found ${pageWords.length} words on page ${currentPage}`);
      allWords.push(...pageWords);

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

    const uniqueWords = Array.from(new Set(allWords));
    console.log(`\nTotal: Found ${uniqueWords.length} unique valid words across ${currentPage} page(s)\n`);
    return uniqueWords;

  } catch (error: any) {
    console.error(`Error fetching word list: ${error.message}`);
    return [];
  }
}

/**
 * Generates DSL rules from natural language constraints using Gemini.
 */
async function generateDslRules(
  apiKey: string,
  prompt: string
): Promise<DslResult> {
  console.log("\n=== Translating Natural Language to DSL ===");
  console.log(`Prompt: "${prompt}"\n`);

  if (!prompt) {
    throw new Error("Please enter a rule description.");
  }

  // Simplified prompt - only generate DSL rules
  const dslPrompt = `Convert the following Wordle constraints into a strict DSL format.

Output ONLY a JSON object with one key:
- 'dsl_rules': a string containing the DSL rules separated by newlines (\\n).

Each rule must be on its own line. For example:
"O at 3\\nA in word\\nno S, T, R, E\\nLENGTH: 5"

Constraints: ${prompt}`;

  // System instruction for DSL format only
  const systemPrompt = `You are a Wordle Rule Translator. You must output a single JSON object with only 'dsl_rules'.
If length is not specified, assume LENGTH: 5.
STRICTLY use the following DSL format with each rule on a separate line (separated by \\n):
- Exact position (Green): [LETTER] at [POSITION] (e.g., O at 3)
- Present in word (Yellow): [LETTER] in word (e.g., A in word)
- Absent (Gray): no [LETTERS, comma-separated] (e.g., no S, T, R, E)
- Length: LENGTH: [NUMBER] (e.g., LENGTH: 5)

Example output:
{"dsl_rules": "O at 3\\nA in word\\nno S, T, R, E\\nLENGTH: 5"}`;

  const payload = {
    contents: [{ parts: [{ text: dslPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          dsl_rules: { type: "STRING" },
        },
      },
    },
  };

  console.log("Calling Gemini API to translate natural language to DSL...\n");

  const result = await handleGeminiApiCall(apiKey, payload);
  const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (jsonText) {
    console.log("✓ DSL translation complete\n");
    const parsedJson: DslResult = JSON.parse(jsonText);
    return parsedJson;
  } else {
    throw new Error("Error: Could not generate DSL. Check console for details.");
  }
}

/**
 * Main function to run the test
 */
async function main() {
  console.log("Wordle Gemini API Test\n");
  console.log("======================\n");

  // Get API key from command line arguments or environment variable
  const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("ERROR: No API key provided.");
    console.error("\nUsage:");
    console.error("  ts-node test-gemini.ts YOUR_API_KEY");
    console.error("  OR");
    console.error("  GEMINI_API_KEY=your_key ts-node test-gemini.ts");
    process.exit(1);
  }

  // Default test prompt from the HTML file (line 70)
  const testPrompt =
    process.argv[3] ||
    "The word has 'A' in it, 'O' is the third letter, and no S, T, R, E, C, L, U, D";

  try {
    const result = await generateDslRules(apiKey, testPrompt);

    console.log("=== GENERATED DSL RULES ===\n");
    console.log(result.dsl_rules);
    console.log();

    // Parse the DSL rules
    const rules = parseRules(result.dsl_rules);
    console.log("Parsed rules:");
    console.log(JSON.stringify(rules, null, 2));
    console.log();

    // Fetch candidate words from bestwordlist.com
    const allWords = await fetchWordListByPosition(rules);

    if (allWords.length === 0) {
      console.log("No words fetched. Exiting.");
      return;
    }

    // Filter words based on all rules
    console.log("=== Filtering Words Based on Rules ===\n");
    const candidateWords = allWords.filter(word => checkRules(word, rules));

    console.log(`Filtered to ${candidateWords.length} candidate words that match all DSL constraints\n`);

    if (candidateWords.length === 0) {
      console.log("No words match the constraints.");
      return;
    }

    // Show first 10 candidates
    console.log("Sample candidates:");
    candidateWords.slice(0, 10).forEach(word => console.log(`  ${word}`));
    if (candidateWords.length > 10) {
      console.log(`  ... and ${candidateWords.length - 10} more`);
    }
    console.log();

    console.log(`\n=== VALIDATING ${candidateWords.length} WORDS WITH DICTIONARY API ===\n`);

    const validWords: string[] = [];

    for (let i = 0; i < candidateWords.length; i++) {
      const word = candidateWords[i];
      process.stdout.write(`[${i + 1}/${candidateWords.length}] Checking "${word}"... `);

      const isValid = await validateWordExistence(word, rules.length);

      if (isValid) {
        console.log("✓ VALID");
        validWords.push(word);
      } else {
        console.log("✗ Invalid (not in dictionary)");
      }

      // Small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("\n=== FINAL VALIDATED RESULTS ===\n");
    console.log(`Valid English Words (${validWords.length}/${candidateWords.length}):`);
    console.log("-----------------------------------");
    if (validWords.length > 0) {
      validWords.forEach((word) => console.log(`  ${word}`));
    } else {
      console.log("  (No valid words found)");
    }
    console.log("\n=== SUCCESS ===\n");
  } catch (error: any) {
    console.error("\n=== ERROR ===");
    console.error(error.message);
    console.error("\nStack trace:");
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the main function
main();
