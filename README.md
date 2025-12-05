# Wordle Rule Validator

AI-assisted deterministic filtering for Wordle puzzles. This tool helps you find valid Wordle words based on the clues you've discovered during gameplay.

## Features

- **Natural Language Input**: Describe your Wordle constraints in plain English
- **AI-Powered Translation**: Uses Google's Gemini API to convert descriptions into a structured rule format
- **Domain-Specific Language (DSL)**: Supports exact matches (green), present letters (yellow), and absent letters (gray)
- **Real-Time Validation**: Instantly filters word lists based on your constraints
- **Clean UI**: Built with Tailwind CSS for a modern, responsive interface

## Quick Start

1. Open `wordle-validator.html` in a web browser
2. Enter your [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key) in the API Configuration field
3. Describe your Wordle constraints in natural language
4. Click "Generate Rules & Run Validator"
5. View matching words in the Results panel

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

### Step 3: Word List

Add words to test (one per line). The default list includes common Wordle words.

### Step 4: Results

View all words that match your constraints.

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

This tool requires a Google Gemini API key. To get one:

1. Visit [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key)
2. Sign in with your Google account
3. Create an API key
4. Enter the key in the "API Configuration" field

The API is used to translate natural language into the DSL format. Rate limiting and exponential backoff are implemented for reliability.

## Technical Details

### Technologies Used
- **HTML5**: Structure
- **Tailwind CSS**: Styling via CDN
- **Vanilla JavaScript**: Logic and API integration
- **Google Gemini API**: Natural language processing

### Key Functions

- `generateDslAndValidate()`: Calls Gemini API to convert natural language to DSL
- `parseRules()`: Parses DSL text into structured rule object
- `validateWord()`: Checks if a word satisfies all constraints
- `applyRules()`: Runs validation on the entire word list

### Error Handling

- API rate limiting with exponential backoff (up to 5 retries)
- Input validation for API keys and prompts
- Graceful error messages in the UI

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

Result: ATTACK, ATTACH, etc.
```

### Example 3: Yellow with Exclusions
```
Natural Language: "Has 'E' but not in position 5, has 'A' at position 1, no T, R, S"
DSL Output:
A at 1
E in word, not at 5
no T, R, S
LENGTH: 5
```

## Limitations

- Requires internet connection for API calls
- API key required for natural language processing
- Manual DSL editing available if AI generation fails
- Word list must be provided by the user

## Privacy & Security

- API keys are stored only in the browser session (not persisted)
- All processing happens client-side except API calls to Gemini
- No user data is stored or transmitted beyond API requests

## License

This project is provided as-is for educational and personal use.

## Contributing

Feel free to fork, modify, and improve this tool. Suggestions for enhancements:
- Add common word list presets
- Support for Wordle variants (Quordle, Octordle, etc.)
- Export/import rule sets
- Dark mode toggle
- Offline mode with pre-generated DSL

## Support

For issues or questions, please open an issue on the project repository.
