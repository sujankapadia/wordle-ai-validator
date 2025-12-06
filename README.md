# Wordle Rule Validator

AI-assisted word finder for Wordle puzzles using real Scrabble word dictionaries. This tool helps you find valid Wordle words based on the clues you've discovered during gameplay by fetching words from bestwordlist.com and applying your constraints.

## Features

- **Natural Language Input**: Describe your Wordle constraints in plain English
- **AI-Powered Translation**: Uses Google's Gemini API to convert descriptions into a structured rule format (DSL)
- **Domain-Specific Language (DSL)**: Supports exact matches (green), present letters (yellow), and absent letters (gray)
- **Real Word Dictionary**: Fetches valid Scrabble words from bestwordlist.com with full pagination support
- **Fast Filtering**: Deterministic client-side filtering based on your constraints
- **Clean UI**: Built with Tailwind CSS for a modern, responsive interface

## Quick Start

1. Open `wordle-ai-validator.html` in a web browser
2. Enter your [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key) in the API Configuration field
3. Describe your Wordle constraints in natural language
4. Click "Generate DSL & Fetch Candidate Words"
5. View matching valid Scrabble words in the Results panel

## How It Works

### Algorithm Overview

The validator uses a hybrid approach combining AI translation, web scraping, and deterministic filtering:

```
Natural Language Input
        ↓
    Gemini API (Translate to DSL)
        ↓
    Parse DSL Rules
        ↓
    Fetch Words from bestwordlist.com
    (using first exact position constraint + pagination)
        ↓
    Filter Locally (check all constraints)
        ↓
    Display Results
```

### Detailed Process

1. **Natural Language → DSL Translation**
   - User describes constraints in plain English (e.g., "has A in it, O is the third letter, no S, T, R, E")
   - Gemini API converts this to structured DSL format
   - Example output: `O at 3\nA in word\nno S, T, R, E\nLENGTH: 5`

2. **DSL Parsing**
   - Parses the DSL string into a structured JavaScript object
   - Extracts exact positions, present letters, absent letters, and word length
   - Example: `{exact: {2: 'O'}, present: {A: []}, absent: ['S','T','R','E'], length: 5}`

3. **Word Fetching from bestwordlist.com**
   - Uses the **first exact position constraint** to build a URL
   - Example: For "O at position 3", fetches from `/p/o/1/words5lettersthirdlettero.htm`
   - **Handles pagination**: Fetches page 1, page 2, page 3, etc. until all words are retrieved
   - Uses CORS proxy (corsproxy.io) to bypass cross-origin restrictions
   - Extracts only valid words (removes words marked with red spans)

4. **Local Filtering**
   - Filters the fetched word list against ALL constraints:
     - Exact position matches (green tiles)
     - Present letters with position exclusions (yellow tiles)
     - Absent letters (gray tiles)
     - Word length
   - This happens entirely client-side for speed

5. **Display Results**
   - Shows all words that pass all filters
   - Words are guaranteed to be valid Scrabble words (from bestwordlist.com)
   - No additional dictionary validation needed

### Why This Approach is Fast

- **Single source of truth**: bestwordlist.com provides pre-validated Scrabble words
- **No dictionary API calls**: Previous approach called dictionaryapi.dev for every word (slow, rate-limited)
- **Smart fetching**: Only fetches words matching one exact position, then filters locally
- **Pagination awareness**: Gets the complete word list, not just the first page
- **Client-side filtering**: All constraint checking happens in the browser

## How to Use

### Step 1: Describe Your Rules

Enter your Wordle constraints in natural language. For example:
```
The word has 'A' in it, 'O' is the third letter, and no S, T, R, E, C, L, U, D
```

### Step 2: Validated DSL Input

The AI generates structured rules in DSL format:
```
O at 3
A in word
no S, T, R, E, C, L, U, D
LENGTH: 5
```

You can also edit these rules manually if needed.

### Step 3: Candidate Pool

Words are automatically fetched from bestwordlist.com and filtered. The textarea shows all valid candidates.

### Step 4: Results

View all words that match your constraints. These are guaranteed to be valid Scrabble words.

## DSL Syntax

The validator supports the following rule formats:

### Exact Match (Green)
When you know a letter's exact position:
```
A at 1    # Letter 'A' is in position 1
O at 3    # Letter 'O' is in position 3
```

### Present Letter (Yellow)
When a letter exists in the word but you don't know where:
```
A in word                  # 'A' is somewhere in the word
Y in word, not at 5        # 'Y' is in the word but NOT at position 5
```

### Absent Letters (Gray)
Letters that don't appear in the word:
```
no S, T, R, E              # None of these letters appear
no X                       # Single letter format also works
```

### Word Length
Specify the word length (defaults to 5):
```
LENGTH: 5                  # Standard Wordle length
LENGTH: 6                  # For longer word variants
```

## API Configuration

This tool requires a Google Gemini API key for natural language translation. To get one:

1. Visit [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key)
2. Sign in with your Google account
3. Create an API key
4. Enter the key in the "API Configuration" field

The API is only used to translate natural language into the DSL format. Rate limiting and exponential backoff are implemented for reliability.

## Technical Details

### Technologies Used
- **HTML5**: Structure
- **Tailwind CSS**: Styling via CDN
- **Vanilla JavaScript**: Logic and API integration
- **Google Gemini API**: Natural language → DSL translation
- **bestwordlist.com**: Source of valid Scrabble words
- **corsproxy.io**: CORS proxy for accessing bestwordlist.com

### Key Functions

- `generateDslAndFetchWords()`: Main orchestrator - calls Gemini, fetches words, filters, and displays results
- `handleGeminiApiCall()`: Gemini API call with retry logic and timeout handling
- `parseRules()`: Parses DSL text into structured rule object
- `fetchWordListByPosition()`: Fetches words from bestwordlist.com with pagination support
- `extractWordsFromHtml()`: Extracts valid words from HTML, excluding invalid words
- `getNextPageNumber()`: Detects pagination to fetch all pages
- `checkDeterministicRules()`: Filters words based on all constraints

### Data Sources

**bestwordlist.com** provides comprehensive Scrabble word lists organized by:
- Letter position (first, second, third, fourth, fifth)
- Word length (5 letters, 6 letters, etc.)
- Pagination (multiple pages per position/length combination)

Example URL: `https://www.bestwordlist.com/p/a/1/words5lettersfirstlettera.htm`

### Error Handling

- API rate limiting with exponential backoff (up to 5 retries)
- Hard timeout (20 seconds) for Gemini API calls
- Graceful fallback if word fetching fails
- Input validation for API keys and prompts
- CORS proxy handles cross-origin restrictions

### Performance Optimizations

- **Pagination**: Fetches all pages to ensure complete word coverage
- **Local filtering**: No external API calls for word validation
- **Smart URL selection**: Uses first exact position constraint to minimize fetched words
- **Deduplication**: Removes duplicate words across pages
- **Minimal delay**: 100ms between page requests to be respectful to the server

## Example Use Cases

### Example 1: Classic Wordle
```
Natural Language: "The word has 'R' and 'A', 'O' is the third letter, no S, T, E"
DSL Output:
O at 3
R in word
A in word
no S, T, E
LENGTH: 5

Process:
1. Fetch all 5-letter words with O at position 3 (721 words across 2 pages)
2. Filter for words containing R and A
3. Filter out words with S, T, or E
Result: GROAN, BROAD, etc.
```

### Example 2: Six-Letter Words
```
Natural Language: "6-letter word with 'A' in it, 'T' at position 2, no R, S, E"
DSL Output:
T at 2
A in word
no R, S, E
LENGTH: 6

Process:
1. Fetch all 6-letter words with T at position 2
2. Filter for words containing A
3. Filter out words with R, S, or E
Result: ATAXIA, ATTACK, etc.
```

### Example 3: Multiple Exact Positions
```
Natural Language: "Has 'A' at position 1 and 'O' at position 3"
DSL Output:
A at 1
O at 3
LENGTH: 5

Process:
1. Fetch all 5-letter words with A at position 1 (538 words across 2 pages)
2. Filter for words with O at position 3
Result: 67 words including ABODE, ABORT, ABOUT, ABOVE, AROMA, AROSE, etc.
```

## Limitations

- **Requires exact position constraint**: At least one exact position (green tile) is required to fetch words
- **Requires internet connection**: For Gemini API and bestwordlist.com
- **API key required**: For natural language → DSL translation
- **CORS proxy dependency**: Relies on corsproxy.io to access bestwordlist.com
- **Scrabble word list**: Uses Scrabble-valid words which may differ slightly from Wordle's dictionary

## Privacy & Security

- API keys are stored only in the browser session (not persisted)
- All filtering happens client-side after word fetching
- No user data is stored or transmitted beyond API requests
- CORS proxy only used to fetch public word lists

## Troubleshooting

### "No exact position requirements found"
- Make sure your constraints include at least one exact position (e.g., "O at 3")
- You can manually add an exact position rule to the DSL textarea

### "Fetching page X failed"
- Check your internet connection
- corsproxy.io might be temporarily unavailable
- Try refreshing the page and running again

### Gemini API timeout
- The request has a 20-second timeout
- If it fails, it will retry up to 5 times with exponential backoff
- Check your API key is valid

## Development

### Testing with TypeScript (Node.js)

A TypeScript test script is included for server-side testing:

```bash
npm install
npx tsx test-gemini.ts
```

This script replicates the HTML logic and is useful for:
- Debugging word fetching logic
- Testing pagination
- Validating DSL parsing
- Comparing results with the browser version

### Files

- `wordle-ai-validator.html` - Main application (single HTML file)
- `test-gemini.ts` - TypeScript test script for server-side testing
- `CLAUDE.md` - Technical documentation for AI assistants
- `README.md` - This file

## License

This project is provided as-is for educational and personal use.

## Contributing

Feel free to fork, modify, and improve this tool. Suggestions for enhancements:
- Cache fetched word lists in localStorage
- Support for Wordle variants (Quordle, Octordle, etc.)
- Export/import rule sets
- Dark mode toggle
- Offline mode with pre-downloaded word lists
- Support for constraints without exact positions (fetch from multiple positions and intersect)

## Support

For issues or questions, please open an issue on the project repository.
