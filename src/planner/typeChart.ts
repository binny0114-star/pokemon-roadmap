const chart: Record<string, { strong: string[]; weak: string[] }> = {
  normal: { strong: [], weak: ['fighting'] },
  fire: { strong: ['grass', 'ice', 'bug', 'steel'], weak: ['water', 'ground', 'rock'] },
  water: { strong: ['fire', 'ground', 'rock'], weak: ['electric', 'grass'] },
  electric: { strong: ['water', 'flying'], weak: ['ground'] },
  grass: { strong: ['water', 'ground', 'rock'], weak: ['fire', 'ice', 'poison', 'flying', 'bug'] },
  ice: { strong: ['grass', 'ground', 'flying', 'dragon'], weak: ['fire', 'fighting', 'rock', 'steel'] },
  fighting: { strong: ['normal', 'ice', 'rock', 'dark', 'steel'], weak: ['flying', 'psychic'] },
  poison: { strong: ['grass'], weak: ['ground', 'psychic'] },
  ground: { strong: ['fire', 'electric', 'poison', 'rock', 'steel'], weak: ['water', 'grass', 'ice'] },
  flying: { strong: ['grass', 'fighting', 'bug'], weak: ['electric', 'ice', 'rock'] },
  psychic: { strong: ['fighting', 'poison'], weak: ['bug', 'ghost', 'dark'] },
  bug: { strong: ['grass', 'psychic', 'dark'], weak: ['fire', 'flying', 'rock'] },
  rock: { strong: ['fire', 'ice', 'flying', 'bug'], weak: ['water', 'grass', 'fighting', 'ground', 'steel'] },
  ghost: { strong: ['psychic', 'ghost'], weak: ['ghost', 'dark'] },
  dragon: { strong: ['dragon'], weak: ['ice', 'dragon'] },
  dark: { strong: ['psychic', 'ghost'], weak: ['fighting', 'bug'] },
  steel: { strong: ['ice', 'rock'], weak: ['fire', 'fighting', 'ground'] },
  fairy: { strong: ['fighting', 'dragon', 'dark'], weak: ['poison', 'steel'] },
}

export function isStrongAgainst(attackingType: string, defendingType: string): boolean {
  return chart[attackingType]?.strong.includes(defendingType) ?? false
}

export function weaknesses(types: string[], generation: number): string[] {
  const result = new Set<string>()
  for (const type of types) {
    for (const weakness of chart[type]?.weak ?? []) {
      if (generation < 6 && weakness === 'fairy') continue
      result.add(weakness)
    }
  }
  return [...result]
}

export function typeCategory(type: string, generation: number): '물리' | '특수' {
  if (generation >= 4) return ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel'].includes(type) ? '물리' : '특수'
  return ['fire', 'water', 'electric', 'grass', 'ice', 'psychic', 'dragon', 'dark'].includes(type) ? '특수' : '물리'
}
