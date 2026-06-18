import type { RoomSnapshot } from "./RoomStateScanner";

export class ConstructionPlanner {
  public plan(room: Room, snapshot: RoomSnapshot): void {
    this.planExtensions(room, snapshot.level);

    this.planContainers(room, snapshot);

    if (snapshot.level >= 3) {
      this.planTowers(room, snapshot.level);
    }

    if (snapshot.level >= 4) {
      this.planStorage(room);
    }
  }

  private countSites(room: Room, type: StructureConstant): number {
    const built = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === type,
    }).length;

    const pending = room.find(FIND_MY_CONSTRUCTION_SITES, {
      filter: s => s.structureType === type,
    }).length;

    return built + pending;
  }

  private buildable(room: Room, x: number, y: number): boolean {
    if (x < 0 || x > 49 || y < 0 || y > 49) return false;

    const terrain = room.getTerrain().get(x, y);
    if (terrain === TERRAIN_MASK_WALL) return false;

    return true;
  }

  private planExtensions(room: Room, level: number): void {
    const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][level];
    if (!maxExtensions) return;

    const current = this.countSites(room, STRUCTURE_EXTENSION);
    if (current >= maxExtensions) return;

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return;

    const missing = maxExtensions - current;
    const positions = this.spiral(room, spawn.pos, missing, 1);

    for (const pos of positions) {
      room.createConstructionSite(pos.x, pos.y, STRUCTURE_EXTENSION);
    }
  }

  private planContainers(room: Room, snapshot: RoomSnapshot): void {
    for (const source of snapshot.sources) {
      const sourcePos = source.pos as RoomPosition;

      const hasContainer = room.find(FIND_STRUCTURES, {
        filter: s =>
          s.structureType === STRUCTURE_CONTAINER &&
          s.pos.getRangeTo(sourcePos) <= 1,
      }).length > 0;

      if (hasContainer) continue;

      const hasPending = room.find(FIND_MY_CONSTRUCTION_SITES, {
        filter: s =>
          s.structureType === STRUCTURE_CONTAINER &&
          s.pos.getRangeTo(sourcePos) <= 1,
      }).length > 0;

      if (hasPending) continue;

      const pos = this.adjacent(room, sourcePos);
      if (pos) {
        room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
      }
    }
  }

  private planTowers(room: Room, level: number): void {
    const maxTowers = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][level];
    if (!maxTowers) return;

    const current = this.countSites(room, STRUCTURE_TOWER);
    if (current >= maxTowers) return;

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return;

    const missing = maxTowers - current;
    const positions = this.spiral(room, spawn.pos, missing, 3);

    for (const pos of positions) {
      room.createConstructionSite(pos.x, pos.y, STRUCTURE_TOWER);
    }
  }

  private planStorage(room: Room): void {
    if (this.countSites(room, STRUCTURE_STORAGE) > 0) return;

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return;

    const pos = this.adjacent(room, spawn.pos, 2);
    if (pos) {
      room.createConstructionSite(pos.x, pos.y, STRUCTURE_STORAGE);
    }
  }

  private adjacent(
    room: Room,
    center: RoomPosition,
    range = 1,
  ): { x: number; y: number } | null {
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = center.x + dx;
        const y = center.y + dy;
        if (!this.buildable(room, x, y)) continue;

        const look = room.lookAt(x, y);
        const blocked = look.some(
          item => item.structure || item.constructionSite,
        );
        if (blocked) continue;

        return { x, y };
      }
    }

    return null;
  }

  private spiral(
    room: Room,
    center: RoomPosition,
    count: number,
    minRange: number,
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    let ring = minRange;

    while (positions.length < count && ring < 10) {
      const ringPositions = this.ring(center, ring);
      for (const pos of ringPositions) {
        if (positions.length >= count) break;
        if (!this.buildable(room, pos.x, pos.y)) continue;

        const look = room.lookAt(pos.x, pos.y);
        const blocked = look.some(
          item => item.structure || item.constructionSite,
        );
        if (blocked) continue;

        positions.push(pos);
      }
      ring++;
    }

    return positions;
  }

  private ring(
    center: RoomPosition,
    radius: number,
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];

    for (let dx = -radius; dx <= radius; dx++) {
      positions.push({ x: center.x + dx, y: center.y - radius });
      positions.push({ x: center.x + dx, y: center.y + radius });
    }

    for (let dy = -radius + 1; dy <= radius - 1; dy++) {
      positions.push({ x: center.x - radius, y: center.y + dy });
      positions.push({ x: center.x + radius, y: center.y + dy });
    }

    return positions.filter(
      p => p.x >= 0 && p.x <= 49 && p.y >= 0 && p.y <= 49,
    );
  }
}
