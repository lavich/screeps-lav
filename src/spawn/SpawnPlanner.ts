import type { BodyProfile } from "../tasks/Task";
import { BodyPlanner } from "./BodyPlanner";

export class SpawnPlanner {
  public constructor(private readonly bodyPlanner: BodyPlanner) {}

  public run(room: Room): void {
    const spawn = room.find(FIND_MY_SPAWNS).find(candidate => !candidate.spawning);
    if (!spawn) {
      return;
    }

    const creeps = Object.values(Game.creeps).filter(creep => creep.memory.homeRoom === room.name);
    const workerCount = creeps.filter(creep => creep.memory.bodyProfile === "worker").length;
    const desiredWorkers = Math.max(2, room.find(FIND_SOURCES).length * 2);

    if (workerCount >= desiredWorkers) {
      return;
    }

    const profile: BodyProfile = "worker";
    const body = this.bodyPlanner.build(profile, room.energyCapacityAvailable);

    if (this.bodyCost(body) > room.energyAvailable) {
      return;
    }

    const name = `${profile}-${room.name}-${Game.time}`;
    spawn.spawnCreep(body, name, {
      memory: {
        homeRoom: room.name,
        bodyProfile: profile,
        generation: Game.time
      }
    });
  }

  private bodyCost(body: BodyPartConstant[]): number {
    return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
  }
}
