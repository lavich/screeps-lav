import type { Demand, TaskMemory } from "./Task";

export class TaskFactory {
  public fromDemand(demand: Demand): TaskMemory {
    const base = {
      id: `task:${demand.id}`,
      roomName: demand.roomName,
      targetId: demand.targetId,
      priority: demand.priority,
      createdAt: Game.time,
      expiresAt: demand.expiresAt
    };

    switch (demand.kind) {
      case "mine":
        return {
          ...base,
          type: "harvest",
          requirements: { work: 1, carry: 0, move: 1 }
        };
      case "fill":
        return {
          ...base,
          type: "transfer",
          resourceType: RESOURCE_ENERGY,
          requirements: { carry: 1, move: 1 }
        };
      case "build":
        return {
          ...base,
          type: "build",
          requirements: { work: 1, carry: 1, move: 1 }
        };
      case "repair":
        return {
          ...base,
          type: "repair",
          requirements: { work: 1, carry: 1, move: 1 }
        };
      case "upgrade":
        return {
          ...base,
          type: "upgrade",
          requirements: { work: 1, carry: 1, move: 1 }
        };
    }
  }
}
