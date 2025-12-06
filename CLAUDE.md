# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a single-file HTML application that validates Wordle words using AI-powered rule translation and deterministic filtering. The app uses Google's Gemini API to convert natural language constraints into a structured Domain-Specific Language (DSL), then validates candidate words against those constraints and an external dictionary API.

## Architecture

### Single-File Application Structure
- **File**: `wordle-ai-validator.html` (lines 1-541)
- **Stack**: HTML5 + Vanilla JavaScript + Tailwind CSS (CDN)
- **No build process**: Open the HTML file directly in a browser

### Core Components

1. **UI Sections** (lines 45-132):
   - API Key Input (line 62-64)
   - Natural Language Prompt Input (lines 67-77)
   - Generated DSL Rules Display (lines 80-88)
   - Word List & Validation Status (lines 93-119)
   - Results Display (lines 122-128)

2. **API Integration**:
   - **Gemini API** (line 136): Converts natural language → DSL rules + generates candidate words
   - **Dictionary API** (line 138): Validates word existence (dictionaryapi.dev)
   - **Word Cache** (line 141): Prevents repeated dictionary API calls

3. **Core Logic Flow**:
   ```
   User Input (Natural Language)
        ↓
   generateDslAndCandidates() [lines 258-339]
        ↓
   Gemini API Call → Returns JSON with DSL rules + candidate words
        ↓
   parseRules() [lines 347-411] → Converts DSL text to structured object
        ↓
   applyRules() [lines 465-531]
        ↓
   checkDeterministicRules() [lines 416-459] → Filters candidates
        ↓
   validateWordExistence() [lines 213-252] → External dictionary check
        ↓
   Display Results
   ```

### DSL Rule Format (lines 289-295, 356-399)

The system enforces strict DSL syntax:
- **Exact position (Green)**: `[LETTER] at [POSITION]` (e.g., `O at 3`)
- **Present in word (Yellow)**: `[LETTER] in word` or `[LETTER] in word, not at [POSITION]`
- **Absent (Gray)**: `no [LETTERS]` (e.g., `no S, T, R, E`)
- **Length**: `LENGTH: [NUMBER]` (defaults to 5)

### Key Technical Details

1. **API Error Handling** (lines 149-206):
   - Exponential backoff with up to 5 retries
   - Hard timeout of 20 seconds (line 144)
   - Rate limit handling (429 responses)

2. **Validation Pipeline** (lines 488-504):
   - Step 1: Filter deterministically (fast)
   - Step 2: Validate with external API (slow, with 50ms delay between calls)
   - Uses caching to avoid redundant API calls

3. **Rule Parsing** (lines 347-411):
   - Converts 1-based positions to 0-based indices
   - Cleans up conflicts (removes present/exact letters from absent set)
   - Handles multiple DSL formats for robustness

## Development Commands

### Running the Application
```bash
# Open the HTML file in a browser
open wordle-ai-validator.html  # macOS
```

No build, test, or lint commands exist as this is a standalone HTML file.

## API Configuration

The application requires a **Google Gemini API key**:
1. Get a key from: https://ai.google.dev/gemini-api/docs/api-key
2. Enter it in the "API Configuration" field in the UI
3. Key is stored only in the browser session (not persisted)

## Known Issues & Constraints

- **External dictionary API is slow and rate-limited** (mentioned in line 51-52)
- **Use small word lists** to avoid overwhelming the dictionary API
- API fallback strategy: assumes words are valid if dictionary check fails (lines 242-250)

## Modification Guidelines

### Changing DSL Format
- Update system instruction in `generateDslAndCandidates()` (lines 289-295)
- Update parsing logic in `parseRules()` (lines 347-411)
- Update validation logic in `checkDeterministicRules()` (lines 416-459)

### Adding New Validation Rules
1. Add rule to `rules` object structure (lines 348-353)
2. Add parsing logic in `parseRules()`
3. Add validation check in `checkDeterministicRules()`

### Changing API Providers
- **Gemini API**: Update `GEMINI_API_URL` (line 136) and payload structure (lines 297-311)
- **Dictionary API**: Update `DICT_API_URL` (line 138) and `validateWordExistence()` (lines 213-252)

## Important Implementation Notes

- All positions in the DSL are **1-based** (user-facing) but converted to **0-based** internally (lines 361, 385)
- Word normalization: Always uppercase for consistency (lines 477-479)
- The combined prompt approach (lines 280-286) generates both DSL and candidates in a single API call
- JSON schema enforcement (lines 303-309) ensures structured responses from Gemini
