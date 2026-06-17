import type { Demand } from "../tasks/Task";
import type { RoomSnapshot } from "./RoomStateScanner";

export class DemandPlanner {
  public plan(snapshot: RoomSnapshot): Demand[] {
    const demands: Demand[] = [];

    for (const source of snapshot.sources) {
      demands.push({
        id: `${snapshot.roomName}:mine:${source.id}`,
        roomName: snapshot.roomName,
        kind: "mine",
        priority: 900,
        targetId: source.id,
        expiresAt: Game.time + 5
      });
    }

    for (const sink of snapshot.energySinks) {
      demands.push({
        id: `${snapshot.roomName}:fill:${sink.id}`,
        roomName: snapshot.roomName,
        kind: "fill",
        priority: 800,
        targetId: sink.id,
        expiresAt: Game.time + 5
      });
    }

    const firstSite = snapshot.constructionSites[0];
    if (firstSite) {
      demands.push({
        id: `${snapshot.roomName}:build:${firstSite.id}`,
        roomName: snapshot.roomName,
        kind: "build",
        priority: 500,
        targetId: firstSite.id,
        expiresAt: Game.time + 10
      });
    }

    if (snapshot.level > 0) {
      demands.push({
        id: `${snapshot.roomName}:upgrade:controller`,
        roomName: snapshot.roomName,
        kind: "upgrade",
        priority: 300,
        targetId: "controller",
        expiresAt: Game.time + 10
      });
    }

    return demands;
  }
}
