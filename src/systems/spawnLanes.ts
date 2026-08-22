export type SpawnLaneEnemy = {
  readonly lane: number
  readonly y: number
  readonly speedFactor: number
  readonly bodyWidth: number
  readonly bodyHeight: number
}

export type SpawnLaneType = Omit<SpawnLaneEnemy, 'lane' | 'y'>

type Interval = {
  readonly start: number
  readonly end: number
}

/**
 * Steht der bestehende Gegner der Spawn-Stelle so nah, dass beide ineinander
 * erscheinen wuerden?
 *
 * Bis 2026-08-22 sperrte diese Pruefung zusaetzlich jede Spur, auf der ein schnellerer
 * Neuling einen langsameren Bestandsgegner IRGENDWANN auf der Strecke einholen wuerde.
 * Der Preis war unbezahlbar: Gemessen scheiterten bei Level 12 1.360 von 1.396
 * Spawn-Versuchen (97 %), weil jeder langsame Gegner irgendwo auf der Bahn eine breite
 * Horde blockierte. Das war die Ursache dafuer, dass trotz 14er-Horden nur ein
 * Bruchteil davon im Bild ankam.
 *
 * Zwei Gegner, die sich unterwegs ueberholen und dabei ueberlappen, sind kein Fehler -
 * sie sind untereinander nicht einmal Kollisionsobjekte, und dichte Massen sind genau
 * das Zielbild. Verhindert werden muss nur das Erscheinen IM anderen.
 */
function canMeet(newEnemy: SpawnLaneEnemy, existingEnemy: SpawnLaneEnemy): boolean {
  const verticalDistance = Math.abs(existingEnemy.y - newEnemy.y)
  return verticalDistance < (newEnemy.bodyHeight + existingEnemy.bodyHeight) / 2
}

export function chooseSpawnLane(
  activeEnemies: readonly SpawnLaneEnemy[],
  newEnemy: SpawnLaneType & Pick<SpawnLaneEnemy, 'y'>,
  roadHalfWidthTop: number,
  random: () => number,
  safetyGap: number,
  // W3-Mittelband: begrenzt den Schwerpunkt zusaetzlich auf einen Anteil der halben
  // Spielfeldbreite, damit Horden mittig laufen und die Raender frei bleiben.
  maxLaneLimit = 1,
  // Gesamtbreite der Formation, falls es eine ist. NUR fuer den Randabstand: Sie
  // bestimmt, wie weit der Schwerpunkt nach aussen darf, damit kein Mitglied ueber die
  // Korridorkante ragt. Die Abstaende zu bestehenden Gegnern rechnen dagegen mit der
  // Breite EINES Mitglieds - eine Formation ist kein Block, zwischen ihren Reihen ist
  // Platz, und treffen koennen sich nur einzelne Figuren.
  formationWidthPx = newEnemy.bodyWidth,
): number | undefined {
  const maxLane = Math.max(0, Math.min((roadHalfWidthTop - formationWidthPx / 2) / roadHalfWidthTop, maxLaneLimit))
  const blocked = activeEnemies
    .filter((enemy) => canMeet({ ...newEnemy, lane: 0 }, enemy))
    .map((enemy) => {
      const minimumLaneDistance = ((newEnemy.bodyWidth + enemy.bodyWidth) / 2 + safetyGap) / roadHalfWidthTop
      return {
        start: Math.max(-maxLane, enemy.lane - minimumLaneDistance),
        end: Math.min(maxLane, enemy.lane + minimumLaneDistance),
      }
    })
    .filter((interval) => interval.start < interval.end)
    .sort((left, right) => left.start - right.start)

  const allowed: Interval[] = []
  let cursor = -maxLane
  for (const interval of blocked) {
    if (interval.start > cursor) allowed.push({ start: cursor, end: interval.start })
    cursor = Math.max(cursor, interval.end)
  }
  if (cursor < maxLane) allowed.push({ start: cursor, end: maxLane })

  const totalLength = allowed.reduce((sum, interval) => sum + interval.end - interval.start, 0)
  if (totalLength <= 0) return undefined

  let offset = Math.min(Math.max(random(), 0), 0.9999999999999999) * totalLength
  for (const interval of allowed) {
    const length = interval.end - interval.start
    if (offset < length) return interval.start + offset
    offset -= length
  }
  return allowed[allowed.length - 1].end
}
