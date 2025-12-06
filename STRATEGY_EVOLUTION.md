# Strategy Evolution: Wordle AI Validator

This document chronicles the evolution of approaches we tried while building the Wordle AI Validator, from manual word entry to the current optimized solution.

---

## Strategy 0: Manual Word List Entry (Original)

### Approach
- User enters natural language constraints
- Gemini translates natural language → DSL rules
- **User manually enters their own list of candidate words**
- Click "Run Validation" to filter words based on rules

### Problems
- User had to manually compile a word list
- Tedious to find and enter candidate words
- Default word list was just random examples (AGONY, AMONG, GUMBO, GAMES, FIGHT, WAGON, KAYAK)
- No automation for finding relevant candidate words

---

## Strategy 1: Gemini Generates Both DSL + Candidate Words

### Approach
- User enters natural language constraints
- Ask Gemini to translate natural language → DSL **AND** generate 30 candidate words in a single call
- Automated the word list generation completely

### Problems
- **Gemini calls took >20 seconds and frequently timed out**
- Generated words had spaces between letters ("H O A G Y" instead of "HOAGY")
- Most Gemini-generated words weren't valid English words
- Reduced from 30 to 15 words to avoid timeouts, but still had quality issues
- Updated prompts to prevent spaces, but word validity remained poor

### Code Evidence
```javascript
// Combined prompt to generate both DSL and candidates
const combinedPrompt = `Convert the following constraints into a Wordle DSL format,
and then generate 15 common VALID English dictionary words...`;

const systemPromptCombined = `You are a Wordle Rule Translator and Candidate Generator.
You must output a single JSON object with 'dsl_rules' and 'candidate_words'.`;
```

---

## Strategy 2: Add Dictionary API Validation

### Approach
- Keep Gemini generating both DSL + candidate words
- Validate Gemini's candidate words using dictionaryapi.dev
- Filter out invalid words before showing results

### Problems
- **Gemini was still very slow (20+ seconds)**
- **Most Gemini words were invalid (only 1-3 out of 15 were real words)**
- Added 50ms delays between dictionary calls to avoid rate limits (429 errors)
- **Overall process was extremely slow (30+ seconds total)**
- Wasted API calls validating mostly invalid words

### Code Evidence
```javascript
async function validateWordExistence(word, requiredLength) {
    const response = await fetch(DICT_API_URL + word);
    // Check if word exists in dictionary
}

// In applyRules():
await new Promise(resolve => setTimeout(resolve, 50)); // Delay to avoid rate limits
const isDictionaryWord = await validateWordExistence(word, rules.length);
```

---

## Strategy 3: Web Search Exploration

### Approach
- Explored alternative ways to find valid words
- Tried various web search approaches
- Investigated different word list sources

### Discovery
- **Found bestwordlist.com** - comprehensive Scrabble word lists organized by letter position
- Site structure: `/p/{letter}/{page}/words{length}letters{position}letter{letter}.htm`
- Example: `/p/o/1/words5lettersthirdlettero.htm` for 5-letter words with O at position 3
- Words are marked as valid (black text) or invalid (red text)

---

## Strategy 4: Prototype bestwordlist.com Fetching

### Approach
- Created `test-wordlist-fetch.ts` to test fetching from bestwordlist.com
- Fetch words matching exact position constraint
- Extract words from HTML
- Filter locally for other constraints

### Success
- Successfully fetched 373 words
- Filtered to 8 candidates matching all constraints
- Proved the concept works

### Problems
- HTML parsing needed improvement (had to handle `<b>` tags and red spans)
- Only fetched page 1 (didn't realize there was pagination yet)
- Needed better word extraction regex

### Code Evidence
```typescript
// test-wordlist-fetch.ts
const url = `https://www.bestwordlist.com/p/${letter.toLowerCase()}/1/words${rules.length}letters${positionName}letter${letter.toLowerCase()}.htm`;
const response = await fetch(url);
const html = await response.text();
// Extract words with regex...
```

---

## Strategy 5: Gemini DSL Only + bestwordlist.com (First Working Version)

### Approach
- **Gemini generates ONLY DSL rules** (not candidate words anymore)
- Fetch words from bestwordlist.com based on first exact position constraint
- Filter locally for all other constraints (exact positions, present letters, absent letters)
- Use dictionary API to validate fetched words

### Integration
- Created `test-gemini.ts` combining Gemini DSL translation + word fetching
- Updated Gemini prompts to only request DSL rules
- Integrated into TypeScript test script first, before HTML

### Problems
- **Only fetched page 1 from bestwordlist.com** - missed words on page 2, 3, etc.
- Created `test-intersection.ts` to verify word intersection across position pages
- **Discovery**: Found 20+ missing words (AROID, AROMA, AROSE, ATOLL, etc.) that were on page 2
- Dictionary validation may not have been needed (bestwordlist.com already provides valid Scrabble words)

### Code Evidence
```typescript
// Updated to only generate DSL
interface DslResult {
  dsl_rules: string; // Removed candidate_words
}

const dslPrompt = `Convert the following Wordle constraints into a strict DSL format.
Output ONLY a JSON object with one key: 'dsl_rules'...`;
```

### Pagination Bug Discovery
```typescript
// test-intersection.ts findings:
// O-at-3 page found 67 words with pattern A__O_
// A-at-1 page found only 47 words with pattern A__O_
// Missing 20 words: AROID, AROMA, AROSE, ATOLL, ATOMS, ATOMY, ATONE, etc.
// Evidence of pagination:
// <link rel=next href=/p/a/1/words5lettersfirstletterapage2.htm>
```

---

## Strategy 6: Remove Dictionary API + Add Pagination ⭐ (Current)

### Approach
- Gemini generates ONLY DSL rules
- **Fetch ALL pages from bestwordlist.com** (pagination support)
- **Skip dictionary API entirely** (bestwordlist.com provides valid Scrabble words)
- Filter locally for all constraints
- Use CORS proxy (corsproxy.io) for client-side fetching

### Implementation Details

#### Pagination Support
```javascript
async function fetchWordListByPosition(rules) {
    let currentPage = 1;
    let hasMorePages = true;
    const allWords = [];

    while (hasMorePages) {
        const pageUrl = currentPage === 1
            ? `${baseUrl}.htm`
            : `${baseUrl}page${currentPage}.htm`;

        const response = await fetch(pageUrl);
        const html = await response.text();
        const pageWords = extractWordsFromHtml(html, rules.length);
        allWords.push(...pageWords);

        // Check for next page
        const nextPageNum = getNextPageNumber(html);
        if (nextPageNum && nextPageNum === currentPage + 1) {
            currentPage = nextPageNum;
            await new Promise(resolve => setTimeout(resolve, 100)); // Be respectful
        } else {
            hasMorePages = false;
        }
    }

    return Array.from(new Set(allWords)); // Deduplicate
}
```

#### HTML Word Extraction
```javascript
function extractWordsFromHtml(html, wordLength) {
    // Remove <b> tags
    const cleanHtml = html.replace(/<b>|<\/b>/g, '');

    // Remove invalid words (red spans)
    const redSpanRegex = /<span class=rd>(.*?)<\/span>/g;
    const htmlWithoutRed = cleanHtml.replace(redSpanRegex, '');

    // Extract words
    const wordRegex = new RegExp(`\\b([A-Z]{${wordLength}})\\b`, 'g');
    // ... extract and return words
}
```

#### Pagination Detection
```javascript
function getNextPageNumber(html) {
    // Look for: <link rel=next href=words5lettersfirstletterapage2.htm>
    const nextPageMatch = html.match(/<link rel=next href=[^>]*page(\d+)\.htm>/);
    if (nextPageMatch) {
        return parseInt(nextPageMatch[1], 10);
    }
    return null;
}
```

#### CORS Proxy Integration
```javascript
const CORS_PROXY = "https://corsproxy.io/?";
const baseUrl = `${CORS_PROXY}https://www.bestwordlist.com/p/${letter.toLowerCase()}/1/words${rules.length}letters${positionName}letter${letter.toLowerCase()}`;
```

### Results
- ✅ **5-10 seconds total** (vs 30+ seconds in Strategy 2)
- ✅ **All valid words retrieved** (no missing words due to pagination)
- ✅ **Reliable word quality** (Scrabble-valid from bestwordlist.com)
- ✅ **Works client-side** with CORS proxy
- ✅ **User only needs to enter natural language description**

### Performance Comparison

| Strategy | Total Time | Word Quality | Completeness |
|----------|-----------|--------------|--------------|
| Strategy 0 | Manual | N/A | Manual effort |
| Strategy 1 | 20+ sec | Poor (AI-generated) | 15 words |
| Strategy 2 | 30+ sec | Poor (1-3 valid) | 15 words |
| Strategy 5 | ~15 sec | Good (Scrabble) | Incomplete (page 1 only) |
| **Strategy 6** | **5-10 sec** | **Excellent (Scrabble)** | **Complete (all pages)** |

---

## Key Discoveries Along the Way

### 1. Natural Language Input is Valuable
- Gemini for DSL translation was always part of the solution
- Much easier than learning DSL syntax manually
- Gemini is good at structure/translation tasks

### 2. Gemini Can't Reliably Generate Valid English Words
- Better at structured output than creative content generation
- Most generated words were nonsense or had formatting issues
- This was a critical realization that led to strategy pivot

### 3. Gemini is Slow
- 20+ second timeout on API calls
- Frequent failures and timeouts
- Asking it to generate both DSL + words made it even slower

### 4. Pagination Matters
- Initial implementation only fetched page 1
- Missing 20+ valid words that appeared on subsequent pages
- `test-intersection.ts` was critical for discovering this bug
- Example: A-at-1 page had 736 words total, but we only got 380 from page 1

### 5. bestwordlist.com is the Perfect Data Source
- Pre-validated Scrabble words
- Organized by letter position (perfect for our use case)
- Comprehensive coverage with pagination
- Clearly marks invalid words with red spans

### 6. Local Filtering is Fast
- No need for external validation once we have good word source
- Client-side filtering is near-instantaneous
- Deterministic constraint checking is simple and reliable

### 7. CORS Proxy Enables Client-Side Implementation
- bestwordlist.com doesn't have CORS headers
- corsproxy.io adds the necessary headers
- Allows entire app to run client-side in browser
- No backend server needed

### 8. Dictionary API Validation is Unnecessary
- bestwordlist.com already provides valid Scrabble words
- Dictionary API was a performance bottleneck (with precautionary delays)
- Removing it simplified the architecture

---

## Architecture Evolution

### Strategy 0-2 Architecture
```
User Input (Natural Language)
    ↓
Gemini API (Translate + Generate Words)  [SLOW: 20-30+ seconds]
    ↓
Dictionary API Validation  [SLOW: Multiple API calls]
    ↓
Display Results
```

### Strategy 6 Architecture (Current)
```
User Input (Natural Language)
    ↓
Gemini API (Translate to DSL only)  [5-10 seconds]
    ↓
Parse DSL Rules
    ↓
Fetch from bestwordlist.com (with pagination)  [2-3 seconds]
    ↓
Local Filtering (all constraints)  [Instant]
    ↓
Display Results
```

---

## Files Created During Evolution

### Test Scripts
- `test-gemini.ts` - Main TypeScript test combining Gemini + word fetching + pagination
- `test-intersection.ts` - Discovered pagination bug (missing words on page 2+)
- `test-wordlist-fetch.ts` - Initial prototype for bestwordlist.com fetching

### Configuration
- `package.json` - Node.js dependencies (dotenv, tsx, typescript)
- `tsconfig.json` - TypeScript configuration
- `.gitignore` - Ignore node_modules and .env.local
- `.env.local` - Store GEMINI_API_KEY for testing

### Documentation
- `CLAUDE.md` - Technical documentation for AI assistants
- `README.md` - User-facing documentation with algorithm explanation
- `STRATEGY_EVOLUTION.md` - This document

### Main Application
- `wordle-ai-validator.html` - Complete refactor from Strategy 2 → Strategy 6

---

## Lessons Learned

### What Worked
1. **Incremental testing** - Creating separate test scripts helped isolate issues
2. **Data-driven decisions** - `test-intersection.ts` provided concrete evidence of pagination bug
3. **Leveraging existing data sources** - bestwordlist.com was better than generating our own
4. **Simplification** - Removing dictionary validation made everything faster and simpler

### What Didn't Work
1. **Over-reliance on AI** - Asking Gemini to generate words was a dead end
2. **Premature optimization** - Adding dictionary validation before finding a good word source
3. **Assumptions about completeness** - Assuming page 1 had all words

### Best Practices Established
1. **Test server-side first** - TypeScript scripts caught issues before browser integration
2. **Measure performance** - Timing each step revealed bottlenecks
3. **Validate assumptions** - Created tests to verify intersection behavior
4. **Document as you go** - CLAUDE.md helped maintain context

---

## Future Potential Enhancements

Based on learnings from this evolution:

1. **Cache word lists in localStorage** - Avoid re-fetching the same position lists
2. **Support constraints without exact positions** - Fetch from multiple positions and intersect
3. **Parallel page fetching** - Fetch pagination pages concurrently instead of sequentially
4. **Offline mode** - Pre-download common position lists for offline use
5. **Progressive results** - Show words as pages are fetched (streaming results)
6. **Word frequency scoring** - Rank results by common vs. obscure Scrabble words

---

**Document Created**: 2025-01-05
**Project**: Wordle AI Validator
**Final Strategy**: Strategy 6 (Gemini DSL + bestwordlist.com with pagination)
