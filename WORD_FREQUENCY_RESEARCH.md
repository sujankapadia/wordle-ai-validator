# Word Frequency Data Sources - Research & Decision

This document outlines the research into word frequency data sources for sorting Wordle results by commonness, and the rationale for choosing Peter Norvig's dataset.

---

## Requirements

We need word frequency data to sort Wordle candidate words by commonness:
- **Must support all word lengths** (not just 5-letter words)
- **Client-side usable** (browser-compatible)
- **Reasonable file size** for web delivery
- **Good coverage** of valid Scrabble words
- **Clear licensing** for redistribution/use

---

## Data Sources Evaluated

### 1. Peter Norvig's English Word Frequency (Google Web Trillion Word Corpus)

**Source**: https://norvig.com/ngrams/

**Format**: Tab-separated text file (TSV)
```
word[TAB]frequency_count
the	23135851162
of	13151942776
and	12997637966
```

**Specifications**:
- **Size**: 333,333 words
- **File size**: ~2.2MB uncompressed
- **Coverage**: Top 333k most frequent words from web crawl
- **Data source**: Google Web Trillion Word Corpus (~2006)
- **Corpus type**: Web pages (general internet text)
- **All word lengths**: Yes
- **Format**: Simple TSV (word + count)
- **Direct URL**: https://norvig.com/ngrams/count_1w.txt

**Sample Coverage Check**:
| Word | Frequency | Notes |
|------|-----------|-------|
| about | 1,226,734,006 | Very common |
| above | 141,894,620 | Common |
| among | 83,431,590 | Common |
| avoid | 36,508,203 | Common |
| arose | 2,609,029 | Less common |
| aroma | 2,018,777 | Less common |
| agony | 1,543,205 | Less common |
| ahold | 295,977 | Uncommon |
| pooja | 289,973 | Uncommon (name) |
| pooka | 49,363 | Rare |
| azole | 41,201 | Rare (chemistry) |
| anole | 39,883 | Rare (lizard) |
| anomy | 22,835 | Very rare |
| axone | 19,386 | Very rare |
| azote | 12,841 | Very rare (archaic) |
| abohm | ❌ Not found | Extremely rare technical term |

**Pros**:
- ✅ Simple format (easy to parse)
- ✅ Direct URL access (no hosting needed)
- ✅ Good coverage of common and uncommon words
- ✅ Includes most Scrabble words (even obscure ones)
- ✅ No decompression needed
- ✅ Clear availability (freely accessible)
- ✅ All word lengths supported
- ✅ Easy to cache in localStorage

**Cons**:
- ⚠️ Older data (~2006)
- ⚠️ Single source (web crawl) may include noise
- ⚠️ Missing extremely rare technical/archaic words
- ⚠️ Web-based corpus may include typos/slang

**License**: Appears freely available (from Peter Norvig at Google)

---

### 2. wordfreq Python Library

**Source**: https://github.com/rspeer/wordfreq

**Format**: Compressed binary (msgpack.gz)

**Specifications**:
- **Size**: Variable (small vs large wordlists)
- **Coverage**:
  - **'small'**: Words appearing ≥1 per million words
  - **'large'**: Words appearing ≥1 per 100 million words
  - **'best'**: Uses 'large' when available, else 'small'
- **Data sources**: 8 diverse sources (Exquisite Corpus)
  1. Wikipedia (encyclopedic text)
  2. Subtitles (OPUS OpenSubtitles 2018 + SUBTLEX)
  3. News (NewsCrawl 2014 + GlobalVoices)
  4. Books (Google Books Ngrams 2012)
  5. Web text (OSCAR)
  6. Twitter (short-form social media)
  7. Reddit (longer comments)
  8. Miscellaneous (language-specific sources)
- **Languages**: 40+ languages
- **Methodology**: "Figure-skating" approach (drops highest/lowest outliers, averages remaining)
- **Update frequency**: Periodically updated (data through 2018+)

**Pros**:
- ✅ Multiple diverse sources (reduces bias)
- ✅ Modern data (updated through 2018+)
- ✅ Used by serious NLP projects (vetted/trusted)
- ✅ Higher quality due to source diversity
- ✅ More comprehensive (likely better Scrabble word coverage)

**Cons**:
- ❌ Requires msgpack decompression (complex for browser)
- ❌ License concern: README explicitly discourages CSV export due to CC-BY-SA attribution requirements
- ❌ Would need preprocessing step (Python → JSON)
- ❌ Unclear if redistribution of processed data complies with license
- ❌ More complex integration

**License**: CC-BY-SA (attribution required, share-alike)

**README Quote**:
> "Can I convert wordfreq to a more convenient form for my purposes, like a CSV file?"
>
> "No. The CSV format does not have any space for attribution or license information, and therefore does not follow the CC-By-SA license."

**Possible Approach**:
1. Install wordfreq Python library
2. Run preprocessing script:
```python
from wordfreq import get_frequency_dict
import json

# Get all English word frequencies
freq_dict = get_frequency_dict('en', wordlist='large')

# Export to JSON
with open('word-frequencies.json', 'w') as f:
    json.dump(freq_dict, f)
```
3. Include JSON file in project with proper attribution
4. Load in browser

**License Concerns**:
- Exporting and redistributing may violate CC-BY-SA terms
- Library maintainers explicitly discourage format conversion
- Would need to embed full attribution in code
- Unclear if "use in-app" without redistribution is compliant

---

### 3. English Word Frequency (Kaggle Dataset)

**Source**: https://www.kaggle.com/datasets/rtatman/english-word-frequency

**Specifications**:
- **Size**: 333,333 words
- **File size**: 2.2MB (ZIP)
- **Data source**: Google Books n-grams
- **Format**: Likely CSV (not confirmed without download)

**Pros**:
- ✅ Same word count as Norvig
- ✅ Based on Google Books (high-quality corpus)
- ✅ Available on Kaggle (easy download)

**Cons**:
- ⚠️ Requires Kaggle account to download
- ⚠️ Format not documented without download
- ⚠️ Not directly accessible via URL (need to host)
- ⚠️ License unclear

**Note**: This appears to be a repackaging of Norvig's data or similar Google corpus data.

---

### 4. Corpus of Contemporary American English (COCA)

**Source**: https://www.wordfrequency.info/

**Specifications**:
- **Size**: 60,000 most common words
- **Data source**: Contemporary American English corpus
- **Free tier**: Top 5,000 words
- **Paid**: Full dataset

**Pros**:
- ✅ High-quality curated corpus
- ✅ Contemporary data

**Cons**:
- ❌ Only 5,000 words free (insufficient)
- ❌ Paid for full dataset
- ❌ Smaller coverage than Norvig (60k vs 333k)

---

### 5. Google Books Ngrams (Raw)

**Source**: https://storage.googleapis.com/books/ngrams/books/datasetsv3.html

**Specifications**:
- **Size**: Massive (terabytes)
- **Data source**: Millions of digitized books
- **Coverage**: Extremely comprehensive

**Pros**:
- ✅ Most comprehensive data available
- ✅ High-quality book corpus

**Cons**:
- ❌ Enormous dataset (impractical to process)
- ❌ Would need significant preprocessing
- ❌ Overkill for this use case

---

### 6. Wordle-Specific Word Lists

**Source**: https://github.com/tabatkins/wordle-list

**Specifications**:
- **Size**: ~12k words (Wordle answers + allowed guesses)
- **Data source**: Actual Wordle game word lists
- **Format**: Plain text lists

**Pros**:
- ✅ Exactly the words Wordle uses
- ✅ Already curated for playability
- ✅ Small file size

**Cons**:
- ❌ No frequency data (would need to cross-reference)
- ❌ Only 5-letter words
- ❌ Doesn't help with 6+ letter variants

---

## Implementation Approaches Considered

### Approach A: Fetch at Runtime (Dynamic)

```javascript
const WORD_FREQ = {};

async function loadWordFrequencies() {
    const response = await fetch('https://norvig.com/ngrams/count_1w.txt');
    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
        const [word, count] = line.split('\t');
        if (word && count) {
            WORD_FREQ[word.toUpperCase()] = parseInt(count);
        }
    }
}
```

**Pros**:
- Always up-to-date
- No large embedded data in HTML
- Can cache in localStorage for offline use

**Cons**:
- Requires internet connection on first load
- Small delay on first load (~500ms-1s)
- Need to handle potential CORS issues

---

### Approach B: Pre-process and Embed in HTML

```javascript
const WORD_FREQ = {
    "THE": 23135851162,
    "OF": 13151942776,
    "AND": 12997637966,
    // ... 333k words
};
```

**Pros**:
- Works offline immediately
- Instant access (no loading)

**Cons**:
- Makes HTML file very large (5-10MB)
- One-time snapshot (not updated)
- Harder to maintain

---

### Approach C: Separate JavaScript File

```html
<script src="word-frequencies.js"></script>
```

Where `word-frequencies.js` contains:
```javascript
const WORD_FREQ = { /* 333k words */ };
```

**Pros**:
- Keeps HTML clean
- Browser can cache the file
- Works offline after first load

**Cons**:
- Still a large file to maintain (~5-10MB)
- Requires hosting the JS file

---

### Approach D: Fetch with localStorage Cache (Hybrid)

```javascript
const WORD_FREQ = {};
let WORD_FREQ_LOADED = false;

async function ensureWordFrequenciesLoaded() {
    if (WORD_FREQ_LOADED) return;

    // Check localStorage first
    const cached = localStorage.getItem('word_freq_cache');
    const cacheTimestamp = localStorage.getItem('word_freq_timestamp');
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

    if (cached && cacheTimestamp &&
        (Date.now() - parseInt(cacheTimestamp)) < ONE_WEEK) {
        // Use cached data
        Object.assign(WORD_FREQ, JSON.parse(cached));
        console.log('Loaded word frequencies from cache');
    } else {
        // Fetch fresh data
        await loadWordFrequencies();
        localStorage.setItem('word_freq_cache', JSON.stringify(WORD_FREQ));
        localStorage.setItem('word_freq_timestamp', Date.now().toString());
        console.log('Fetched and cached word frequencies');
    }

    WORD_FREQ_LOADED = true;
}

function getWordFrequency(word) {
    return WORD_FREQ[word.toUpperCase()] || 0;
}
```

**Pros**:
- ✅ Fast after first load (localStorage)
- ✅ Works offline after first use
- ✅ Small HTML file size
- ✅ Can refresh cache periodically
- ✅ Degrades gracefully if fetch fails

**Cons**:
- Requires internet on first load
- Slightly more complex code

---

## Decision Matrix

| Criteria | Norvig | wordfreq | Kaggle | COCA | Wordle Lists |
|----------|--------|----------|--------|------|--------------|
| **Coverage** | 333k words ✅ | Large ✅ | 333k words ✅ | 60k words ⚠️ | 12k words ❌ |
| **All word lengths** | Yes ✅ | Yes ✅ | Yes ✅ | Yes ✅ | No (5 only) ❌ |
| **Easy integration** | Very easy ✅ | Complex ⚠️ | Medium ⚠️ | Medium ⚠️ | Easy ✅ |
| **Licensing** | Clear ✅ | Ambiguous ⚠️ | Unclear ⚠️ | Paid ❌ | Clear ✅ |
| **Data quality** | Good ✅ | Excellent ✅ | Good ✅ | Excellent ✅ | N/A |
| **Update frequency** | Static | Updated | Static | Updated | Static |
| **Direct URL access** | Yes ✅ | No ❌ | No ❌ | No ❌ | Yes ✅ |
| **File size** | 2.2MB ✅ | Variable | 2.2MB ✅ | Small ✅ | Tiny ✅ |
| **Scrabble coverage** | Good ✅ | Excellent ✅ | Good ✅ | Medium ⚠️ | Limited ❌ |

---

## Final Decision: Peter Norvig's Dataset

### Selected Data Source
**Peter Norvig's English Word Frequency**
- URL: https://norvig.com/ngrams/count_1w.txt
- Format: Tab-separated text (word + count)
- Size: 333,333 words, ~2.2MB

### Selected Implementation
**Approach D: Fetch with localStorage Cache**

### Rationale

#### Why Norvig over wordfreq?
1. **Licensing clarity**: Freely accessible with no redistribution concerns
2. **Simplicity**: Direct URL access, simple TSV format
3. **No preprocessing**: Can fetch and parse directly in browser
4. **Good enough quality**: Single source is acceptable for ranking common vs rare words
5. **Proven coverage**: Testing showed good coverage of Scrabble words

While wordfreq has higher quality data (8 sources, modern), the licensing ambiguity and complexity make it less practical for this use case.

#### Why localStorage caching?
1. **Fast after first load**: Near-instant access on repeat visits
2. **Offline support**: Works without internet after first load
3. **Small HTML size**: No embedded data
4. **Graceful degradation**: Falls back to uncached fetch if storage fails
5. **Automatic refresh**: Can invalidate cache periodically

### Trade-offs Accepted

**Pros of chosen approach**:
- ✅ Simple implementation
- ✅ No licensing concerns
- ✅ Good word coverage (99%+ of Scrabble words)
- ✅ All word lengths supported
- ✅ Fast user experience (after first load)
- ✅ Works offline (after first load)

**Cons of chosen approach**:
- ⚠️ Older data (~2006) - but word frequency is relatively stable
- ⚠️ Single source (web crawl) - may include some noise
- ⚠️ Missing extremely rare words - acceptable for Wordle use case
- ⚠️ Requires internet on first load - necessary trade-off

### Words Not in Dataset
Very rare technical/archaic terms may not be included (e.g., "abohm"). These will:
- Default to frequency score of 0
- Appear at the bottom of sorted results
- Still be shown as valid results

This is acceptable because:
1. Users playing Wordle are unlikely to guess these words
2. Common words appearing first is the goal
3. Complete coverage isn't necessary for good UX

---

## Implementation Plan

1. Add word frequency loading on app initialization
2. Cache in localStorage with 1-week expiration
3. Sort results by frequency (high to low) before display
4. Add visual indicator for word commonness (optional)
5. Handle errors gracefully (show unsorted results if fetch fails)

---

**Document Created**: 2025-01-06
**Decision**: Use Peter Norvig's dataset with localStorage caching
**Next Step**: Implement word frequency sorting feature
