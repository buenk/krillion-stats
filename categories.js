// Keyword classifier for Krillion prompts ("Name a ...").
// First matching rule wins, so order goes from specific to general.
// It runs on the site, so changing a rule re-classifies every saved day.
// To pin one prompt to a category, add its exact text to OVERRIDES.

export const OVERRIDES = {
  // 'Name a form medicine comes in (like a pill)': 'Science & Health',
};

export const RULES = [
  ['Games & Tech', /\b(video game|game company|battle royale|minecraft|mario|zelda|sonic|kirby|donkey kong|nintendo|pokemon|pokémon|console|board game|card game|app\b|software|programming|website|tech company|computer|internet|emoji)/i],
  ['Music', /\b(album|song|singer|band|rapper|musician|spotify|music|instrument|genre of music|composer|opera|lyric|guitar|piano|grammy)/i],
  ['Film & TV', /\b(movie|film|tv\b|television|show|sitcom|actor|actress|director|oscar|netflix|disney|pixar|anime|cartoon|character|protagonist)/i],
  ['Sports', /\b(sport|athlete|team|olympic|football|soccer|basketball|baseball|hockey|tennis|golf|cricket|rugby|nba|nfl|fifa|stadium|player|ball\b)/i],
  ['Animals & Nature', /\b(animal|bird|fish|mammal|insect|reptile|dog breed|cat breed|breed|species|feet|tree|plant|flower|fruit tree|mushroom|dinosaur|shark|snake|spider|frog|habitat|weather|cloud)/i],
  ['Food & Drink', /\b(food|dish|cheese|fruit|vegetable|dessert|candy|snack|drink|cocktail|beer|wine|spice|herb|sauce|bread|pasta|cuisine|restaurant|cereal)/i],
  ['Science & Health', /\b(medicine|drug|disease|bone|organ|muscle|element|chemical|planet|moon|star\b|space\b|constellation|scien|physics|math|unit of|body|bodily|biolog|vitamin|virus|mineral|rock\b|gem)/i],
  ['Geography', /\b(country|countries|city|cities|capital|island|river|lake|mountain|ocean|sea\b|state|province|continent|town|desert|volcano|landmark|wonders? of the world|flag|currency|language spoken)/i],
  ['People & Culture', /\b(president|king|queen|emperor|ruler|war\b|battle|historical|famous|inventor|scientist|author|writer|painter|artist|philosopher|politician|celebrity|person|people|religio|christian|islam|hindu|juda|buddh|denomination|language|vampire|werewolf|ghost|myth|god|goddess|fairy tale|folklore)/i],
  ['Art & Books', /\b(book|novel|poem|poet|painting|sculpture|museum|art\b|comic)/i],
  ['Brands & Business', /\b(brand|company|car\b|car make|car model|airline|logo|store|shop|retailer|fashion|clothing|advertis|marketing|bill\b)/i],
  ['Words & Letters', /\b(one-word|word|letter|rhymes?|palindrome|anagram|syllable|starts with|ends with|contains|spelled|adjective|verb|noun|colou?r|shape)/i],
  ['Everyday Things', /\b(something|object|item|thing|household|at home|tool|furniture|appliance)/i],
];

export const CATEGORIES = [...RULES.map(([c]) => c), 'Other'];

export function classify(text) {
  if (!text) return 'Unknown';
  if (OVERRIDES[text]) return OVERRIDES[text];
  for (const [cat, re] of RULES) if (re.test(text)) return cat;
  return 'Other';
}
