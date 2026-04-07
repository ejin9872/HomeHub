// Shared ingredient matching logic used by RecipePage and Recommended

export function normalizeIngredient(name: string): string {
  return name.toLowerCase().replace(/[\s]+/g, ' ').replace(/[^a-z ]/g, '').trim()
}

// Check if needle appears in haystack at a word boundary, allowing plural suffixes
export function wordMatch(haystack: string, needle: string): boolean {
  if (needle.length < 3) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}(s|es)?\\b`).test(haystack)
}

// Preparation modifiers that don't change the core ingredient
const PREP_MODIFIERS = [
  'melted', 'softened', 'cubed', 'diced', 'chopped', 'minced', 'sliced',
  'crushed', 'grated', 'shredded', 'cold', 'warm', 'hot',
  'frozen', 'thawed', 'fresh', 'dried', 'toasted', 'roasted',
  'cooked', 'raw', 'peeled', 'trimmed', 'packed',
  'sifted', 'beaten', 'unsalted', 'salted', 'boneless', 'skinless',
  'finely', 'roughly', 'thinly', 'freshly',
]

function stripModifiers(text: string): string {
  let result = text
  for (const mod of PREP_MODIFIERS) {
    result = result.replace(new RegExp(`\\b${mod}\\b`, 'g'), '')
  }
  return result.replace(/\s+/g, ' ').trim()
}

// Equivalent ingredient groups — different names for the same thing.
// The most-specific (longest) match wins, so compound ingredients like
// "peanut butter" won't accidentally match the "butter" group.
const EQUIVALENT_GROUPS: string[][] = [
  ['sugar', 'granulated sugar', 'caster sugar', 'castor sugar', 'white sugar', 'superfine sugar', 'table sugar'],
  ['brown sugar', 'light brown sugar', 'dark brown sugar', 'demerara sugar', 'muscovado sugar'],
  ['powdered sugar', 'confectioners sugar', 'icing sugar'],
  ['butter'],
  ['flour', 'all purpose flour', 'plain flour'],
  ['cream', 'heavy cream', 'whipping cream', 'heavy whipping cream', 'double cream', 'single cream'],
  ['chocolate', 'dark chocolate', 'plain chocolate', 'semisweet chocolate', 'bittersweet chocolate', 'cooking chocolate'],
  ['milk', 'whole milk'],
  ['oil', 'vegetable oil', 'canola oil', 'cooking oil'],
  // Distinct compounds — own group prevents matching their base
  ['peanut butter'],
  ['almond butter'],
  ['coconut milk'],
  ['almond milk'],
  ['oat milk'],
  ['soy milk'],
  ['coconut oil'],
  ['sesame oil'],
  ['olive oil'],
  ['coconut sugar'],
  ['self raising flour', 'self rising flour'],
  ['bread flour'],
  ['cake flour'],
  ['rice flour'],
  ['almond flour'],
  ['coconut flour'],
  ['white chocolate'],
  ['milk chocolate'],
  ['sour cream'],
  ['cream cheese'],
  ['ice cream'],
]

// Find the most specific equivalence group for an ingredient (longest match wins)
function findGroup(text: string): string[] | null {
  let bestGroup: string[] | null = null
  let bestLength = 0
  for (const group of EQUIVALENT_GROUPS) {
    for (const member of group) {
      if (member.length > bestLength && wordMatch(text, member)) {
        bestGroup = group
        bestLength = member.length
      }
    }
  }
  return bestGroup
}

export function ingredientMatches(a: string, b: string): boolean {
  const normA = normalizeIngredient(a)
  const normB = normalizeIngredient(b)
  if (!normA || !normB) return false

  // Strip preparation modifiers before comparing
  const strippedA = stripModifiers(normA)
  const strippedB = stripModifiers(normB)

  // Check equivalence via known ingredient groups
  const groupA = findGroup(strippedA)
  const groupB = findGroup(strippedB)
  if (groupA && groupB) {
    return groupA === groupB
  }

  // Fallback: word-boundary matching for ingredients not in any group
  if (wordMatch(strippedB, strippedA)) return true
  if (wordMatch(strippedA, strippedB)) return true

  const aWords = strippedA.split(/\s+/).filter(w => w.length > 2)
  if (aWords.length > 1 && aWords.every(w => wordMatch(strippedB, w))) return true

  return false
}
