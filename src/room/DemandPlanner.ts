import { PRIORITY, type Demand } from "../tasks/Task";
import type { HostileSnapshot, RoomSnapshot } from "./RoomStateScanner";

const DANGER_RADIUS = 10;

function chebyshevRange(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function isInDangerZone(pos: { x: number; y: number }, hostiles: HostileSnapshot[]): boolean {
  if (hostiles.length === 0) return false;
  return hostiles.some(h => chebyshevRange(h.pos, pos) <= DANGER_RADIUS);
}

export class DemandPlanner {
  public plan(snapshot: RoomSnapshot): Demand[] {
    const demands: Demand[] = [];
    const hostiles = snapshot.hostiles;

    for (const source of snapshot.sources) {
      if (isInDangerZone(source.pos, hostiles)) continue;

      demands.push({
        id: `${snapshot.roomName}:mine:${source.id}`,
        roomName: snapshot.roomName,
        kind: "mine",
        priority: PRIORITY.MINE,
        targetId: source.id,
        expiresAt: Game.time + 5
      });
    }

    for (const resource of snapshot.droppedEnergy) {
      if (isInDangerZone(resource.pos, hostiles)) continue;

      demands.push({
        id: `${snapshot.roomName}:pickup:${resource.id}`,
        roomName: snapshot.roomName,
        kind: "pickup",
        priority: PRIORITY.PICKUP,
        targetId: resource.id,
        expiresAt: Game.time + 3
      });
    }

    for (const store of snapshot.energyStores) {
      if (isInDangerZone(store.pos, hostiles)) continue;

      demands.push({
        id: `${snapshot.roomName}:withdraw:${store.id}`,
        roomName: snapshot.roomName,
        kind: "withdraw",
        priority: PRIORITY.WITHDRAW,
        targetId: store.id,
        expiresAt: Game.time + 5
      });
    }

    for (const sink of snapshot.energySinks) {
      if (isInDangerZone(sink.pos, hostiles)) continue;

      demands.push({
        id: `${snapshot.roomName}:fill:${sink.id}`,
        roomName: snapshot.roomName,
        kind: "fill",
        priority: PRIORITY.FILL,
        targetId: sink.id,
        expiresAt: Game.time + 5
      });
    }

    for (const site of snapshot.constructionSites) {
      if (isInDangerZone(site.pos, hostiles)) continue;

      demands.push({
        id: `${snapshot.roomName}:build:${site.id}`,
        roomName: snapshot.roomName,
        kind: "build",
        priority: PRIORITY.BUILD,
        targetId: site.id,
        expiresAt: Game.time + 10
      });
    }

    const worstDamaged = snapshot.damagedStructures
      .filter(structure => structure.hits < Math.min(structure.hitsMax, 10000))
      .sort((left, right) => left.hits / left.hitsMax - right.hits / right.hitsMax)
      .slice(0, Math.max(1, Math.floor(snapshot.level + 1)));

    for (const target of worstDamaged) {
      if (isInDangerZone(target.pos, hostiles)) continue;

      demands.push({
        id: `${snapshot.roomName}:repair:${target.id}`,
        roomName: snapshot.roomName,
        kind: "repair",
        priority: PRIORITY.REPAIR,
        targetId: target.id,
        expiresAt: Game.time + 10
      });
    }

    if (snapshot.level > 0) {
      const upgradePos = snapshot.controllerPos;
      if (!upgradePos || !isInDangerZone(upgradePos, hostiles)) {
        demands.push({
          id: `${snapshot.roomName}:upgrade:controller`,
          roomName: snapshot.roomName,
          kind: "upgrade",
          priority: PRIORITY.UPGRADE,
          targetId: "controller",
          expiresAt: Game.time + 10
        });
      }
    }

    return demands;
  }
}
