import Phaser from 'phaser'
import { BALANCE } from '../config/balance'
import { HUD_COLORS, MENU_COLORS } from '../config/colors'
import { readSafeAreaInsets } from '../systems/safeArea'
import { loadSave, type ScoreEntry } from '../systems/save'

export class GameOverScene extends Phaser.Scene {
  private elapsedMs!: number
  private coins!: number
  private scorePlace?: number

  public constructor() {
    super('GameOverScene')
  }

  public init(data: Readonly<{ coins?: number; scorePlace?: number }>): void {
    this.coins = data.coins ?? 0
    this.scorePlace = data.scorePlace
  }

  public create(): void {
    this.elapsedMs = 0
    const insets = readSafeAreaInsets()
    const centerX = this.scale.width / 2
    const centerY = (this.scale.height + insets.top - insets.bottom) / 2
    const topY = centerY - 220
    this.cameras.main.setBackgroundColor('#10131d')
    this.add.text(centerX, topY, 'Game Over', {
      fontFamily: 'system-ui',
      fontSize: '42px',
      color: '#ff7b7b',
    }).setOrigin(0.5)
    this.add.text(centerX, topY + 52, `Coins: ${this.coins}`, {
      fontFamily: 'system-ui',
      fontSize: '22px',
      color: `#${HUD_COLORS.coins.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5)
    if (this.scorePlace !== undefined) {
      this.add.text(centerX, topY + 88, `PLATZ ${this.scorePlace}`, {
        fontFamily: 'system-ui', fontSize: '21px', fontStyle: 'bold', color: '#daf6ff',
      }).setOrigin(0.5)
    }
    this.renderScores(centerX, topY + 128)
    this.add.text(centerX, topY + 270, 'Tippen für Menü', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#daf6ff',
    }).setOrigin(0.5)
    this.input.on('pointerdown', () => {
      if (this.elapsedMs < BALANCE.feedback.gameOverRestartDelayMs) return
      this.scene.start('MenuScene')
    })
  }

  public update(_time: number, rawDeltaMs: number): void {
    this.elapsedMs += Math.min(rawDeltaMs, BALANCE.maxDeltaMs)
  }

  private renderScores(centerX: number, startY: number): void {
    const scores = loadSave().scores
    if (scores.length === 0) return
    this.add.text(centerX, startY, 'BESTE LÄUFE', {
      fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: '#daf6ff',
    }).setOrigin(0.5)
    this.visibleScores(scores).forEach(({ score, place }, index) => {
      const ownScore = place === this.scorePlace
      this.add.text(centerX, startY + 26 + index * 21, this.scoreText(place, score), {
        fontFamily: 'system-ui', fontSize: '15px', fontStyle: ownScore ? 'bold' : 'normal',
        color: this.colorFor(ownScore ? HUD_COLORS.coins : MENU_COLORS.text),
      }).setOrigin(0.5)
    })
  }

  private visibleScores(scores: ScoreEntry[]): Array<{ score: ScoreEntry; place: number }> {
    const topScores = scores.slice(0, BALANCE.menu.scoresShown).map((score, index) => ({ score, place: index + 1 }))
    if (this.scorePlace === undefined || this.scorePlace <= BALANCE.menu.scoresShown) return topScores
    const ownScore = scores[this.scorePlace - 1]
    return [...topScores.slice(0, -1), { score: ownScore, place: this.scorePlace }]
  }

  private scoreText(place: number, score: ScoreEntry): string {
    const totalSeconds = Math.floor(score.timeMs / 1000)
    return `${place}.  ¢ ${score.coins}   LEVEL ${score.level}   ${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`
  }

  private colorFor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }
}
