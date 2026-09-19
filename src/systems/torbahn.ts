import Phaser from 'phaser'
import type { BahnSystem } from './versuchBahnen'
import type { WeaponKey } from './weapons'

/**
 * TORLAUF (E0): leere Bahn ohne Wände. E2/E3 bringen hier Torpaare und Horde hinein.
 * Die leeren Gruppen sind trotzdem nötig, weil die Szene sie sofort an Kollisionen hängt.
 */
export class Torbahn implements BahnSystem {
  private readonly walls: Phaser.Physics.Arcade.Group
  private readonly rewards: Phaser.Physics.Arcade.Group

  public constructor(scene: Phaser.Scene) {
    this.walls = scene.physics.add.group()
    this.rewards = scene.physics.add.group()
  }

  public getWalls(): Phaser.Physics.Arcade.Group { return this.walls }
  public getRewards(): Phaser.Physics.Arcade.Group { return this.rewards }
  public hasActivePair(): boolean { return false }
  public resetForLevel(_level: number): void {}
  public deactivateAll(): void {}
  public isWall(_candidate: Phaser.GameObjects.GameObject): _candidate is Phaser.Physics.Arcade.Image { return false }
  public getWallPresence(_y: number, _halfSpanPx: number): Readonly<{ left: boolean; right: boolean }> { return { left: false, right: false } }
  public isPickupSegment(_candidate: Phaser.GameObjects.GameObject): _candidate is Phaser.Physics.Arcade.Image { return false }
  public isDrainSegment(_candidate: Phaser.GameObjects.GameObject): boolean { return false }
  public collectPickup(_wall: Phaser.Physics.Arcade.Image): number { return 0 }
  public isReward(_candidate: Phaser.GameObjects.GameObject): _candidate is Phaser.Physics.Arcade.Image { return false }
  public collect(_reward: Phaser.Physics.Arcade.Image): WeaponKey | undefined { return undefined }
  public damage(_wall: Phaser.Physics.Arcade.Image, _damage: number): boolean { return false }
  public update(_dt: number): void {}
  public getSegmentHeight(_side: 'left' | 'right'): number { return 0 }
}
