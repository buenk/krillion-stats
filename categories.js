// Keyword classifier for Krillion prompts ("Name a ...").
// First matching rule wins, so order goes from specific to general.
// It runs on the site, so changing a rule re-classifies every saved day.
// To pin one prompt to a category, add its exact text to OVERRIDES.

export const OVERRIDES = {
  // 'Name a form medicine comes in (like a pill)': 'Science & Health',
};

export const RULES = [
  ['Music', /\b(album|song|singer|band|rapper|musician|spotify|music|instrument|genre of music|composer|opera|lyric|guitar|piano|grammy)/i],
  ['Film & TV', /\b(movie|film|tv |television|show|sitcom|actor|actress|director|oscar|netflix|disney|pixar|anime|cartoon|character)/i],
  ['Games & Tech', /\b(video game|game company|console|nintendo|pokemon|pokémon|board game|card game|app\b|software|programming|website|tech company|computer|internet|emoji)/i],
  ['Sports', /\b(sport|athlete|team|olympic|football|soccer|basketball|baseball|hockey|tennis|golf|cricket|rugby|nba|nfl|fifa|stadium|player|ball\b)/i],
  ['Animals & Nature', /\b(animal|bird|fish|mammal|insect|reptile|dog breed|cat breed|breed|species|feet|tree|plant|flower|fruit tree|mushroom|dinosaur|shark|snake|spider|frog)/i],
  ['Food & Drink', /\b(food|dish|cheese|fruit|vegetable|dessert|candy|snack|drink|cocktail|beer|wine|spice|herb|sauce|bread|pasta|cuisine|restaurant|cereal)/i],
  ['Science & Health', /\b(medicine|drug|disease|bone|organ|muscle|element|chemical|planet|moon|star\b|constellation|scien|physics|math|unit of|body part|vitamin|virus|mineral|rock\b|gem)/i],
  ['Geography', /\b(country|countries|city|cities|capital|island|river|lake|mountain|ocean|sea\b|state|province|continent|town|desert|volcano|landmark|flag|currency|language spoken)/i],
  ['People & History', /\b(president|king|queen|emperor|ruler|war\b|battle|historical|famous|inventor|scientist|author|writer|painter|artist|philosopher|politician|celebrity|person|people)/i],
  ['Art & Books', /\b(book|novel|poem|poet|painting|sculpture|museum|art\b|comic|myth|god|goddess|fairy tale)/i],
  ['Brands & Business', /\b(brand|company|car\b|car make|car model|airline|logo|store|shop|retailer|fashion|clothing|company)/i],
  ['Words & Letters', /\b(word|letter|rhymes?|palindrome|anagram|syllable|starts with|ends with|contains|spelled|adjective|verb|noun|color|colour|shape)/i],
];

export const CATEGORIES = [...RULES.map(([c]) => c), 'Other'];

export function classify(text) {
  if (!text) return 'Unknown';
  if (OVERRIDES[text]) return OVERRIDES[text];
  for (const [cat, re] of RULES) if (re.test(text)) return cat;
  return 'Other';
}
