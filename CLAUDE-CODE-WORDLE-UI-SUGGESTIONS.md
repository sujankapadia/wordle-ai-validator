# Wordle-Style UI Suggestions

This document outlines suggested changes to make the word display look like the actual Wordle game.

---

## Visual Changes

### 1. **Letter Tile Design**
Instead of showing words as plain text (e.g., "TITAN"), display each word as a row of 5 tiles (one per letter):

```
┌───┬───┬───┬───┬───┐
│ T │ I │ T │ A │ N │
└───┴───┴───┴───┴───┘
```

Each tile would be a square box with:
- **Border**: 2px solid border
- **Size**: Equal width and height (e.g., 50px × 50px or 60px × 60px)
- **Font**: Bold, uppercase, centered
- **Spacing**: Small gap between tiles (e.g., 5px)

### 2. **Color Coding Based on Constraints**

Color each tile to show how it matches the DSL rules:

- **Green background** (`#6aaa64`): Letter is in the correct position (exact match)
  - Example: If DSL has "A at 4", the 4th tile in "TITAN" would be green

- **Yellow background** (`#c9b458`): Letter is present in the word but at a different position than required
  - Example: If DSL has "T in word, not at 1", the T at position 1 in "TITAN" would be yellow

- **Gray background** (`#787c7e`): Letter position is unconstrained or doesn't match any special rule
  - Default for letters that just happen to be there

- **White/Light gray text on colored backgrounds** for readability

### 3. **Layout Structure**

Instead of:
```html
<div class="text-lg font-mono p-2 bg-white border...">TITAN</div>
```

Use something like:
```html
<div class="word-row">
  <div class="letter-tile green">T</div>
  <div class="letter-tile gray">I</div>
  <div class="letter-tile gray">T</div>
  <div class="letter-tile green">A</div>
  <div class="letter-tile gray">N</div>
</div>
```

### 4. **CSS Styling**

```css
.word-row {
  display: flex;
  gap: 5px;
  margin-bottom: 8px;
  justify-content: center; /* or flex-start */
}

.letter-tile {
  width: 50px;
  height: 50px;
  border: 2px solid #d3d6da;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  text-transform: uppercase;
  color: white;
}

.letter-tile.green {
  background-color: #6aaa64;
  border-color: #6aaa64;
}

.letter-tile.yellow {
  background-color: #c9b458;
  border-color: #c9b458;
}

.letter-tile.gray {
  background-color: #787c7e;
  border-color: #787c7e;
}
```

### 5. **Additional Enhancements**

- **Frequency indicator**: Show the frequency count below or beside each word row (not on the tiles themselves)
- **Hover effect**: Slight scale/shadow effect on hover
- **Animation**: Optional flip animation when words appear (like Wordle reveals)
- **Responsive sizing**: Smaller tiles on mobile devices
- **Accessible tooltips**: Keep the frequency tooltip functionality

### 6. **Logic Changes Needed**

In the JavaScript where you currently create word elements:

```javascript
// Current:
wordElement.textContent = word;

// New: Generate tile-based HTML
function createWordTiles(word, rules) {
  const container = document.createElement('div');
  container.className = 'word-row';

  for (let i = 0; i < word.length; i++) {
    const tile = document.createElement('div');
    tile.className = 'letter-tile ' + getTileColor(word[i], i, rules);
    tile.textContent = word[i];
    container.appendChild(tile);
  }

  return container;
}

function getTileColor(letter, position, rules) {
  // Check if this position has an exact match
  if (rules.exact[position] === letter) {
    return 'green';
  }

  // Check if letter is present but constrained
  if (rules.present[letter]) {
    const disallowedPositions = rules.present[letter];
    if (disallowedPositions.includes(position)) {
      return 'yellow'; // Letter is here but shouldn't be
    }
  }

  return 'gray';
}
```

---

## Benefits

1. **Visual consistency** with Wordle - users immediately understand the format
2. **Better constraint visualization** - see at a glance which letters match which rules
3. **More engaging UI** - looks polished and game-like
4. **Educational** - helps users understand why each word is valid

---

## Implementation Notes

### Files to Modify
- `wordle-ai-validator.html` - Add CSS styles and update JavaScript word rendering logic

### Current Code Location
The word rendering logic is currently around line 595-607 in `wordle-ai-validator.html`:

```javascript
const resultsDiv = $('results');
resultsDiv.innerHTML = '';
sortedWords.forEach(word => {
    const freq = getWordFrequency(word);
    const wordElement = document.createElement('div');
    wordElement.className = 'text-lg font-mono p-2 bg-white border border-green-300 rounded-lg hover:bg-green-50 cursor-pointer';
    wordElement.textContent = word;
    // Add frequency as tooltip
    if (freq > 0) {
        wordElement.title = `Frequency: ${freq.toLocaleString()}`;
    }
    resultsDiv.appendChild(wordElement);
});
```

### Suggested Replacement
Replace `wordElement.textContent = word;` with the tile-based rendering approach outlined above.

---

**Document Created**: 2025-12-12
**Status**: Suggestions only - not yet implemented
