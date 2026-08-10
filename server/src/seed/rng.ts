// Generador pseudoaleatorio determinístico — port exacto de
// src/data/periods.js del frontend (seedFromString/seededRandom), para
// que los datos de demo generados acá tengan el mismo carácter (misma
// tendencia/estacionalidad) que la demo visual original.
function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function seedFromString(str: string): number {
  return (hashSeed(str) % 997) / 97
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}
