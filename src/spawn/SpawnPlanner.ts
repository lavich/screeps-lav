import type { RoomSnapshot } from "../room/RoomStateScanner";
import type { BodyProfile, Demand } from "../tasks/Task";
import { BodyPlanner } from "./BodyPlanner";

export class SpawnPlanner {
  public constructor(private readonly bodyPlanner: BodyPlanner) {}

  public run(room: Room, snapshot: RoomSnapshot, demands: Demand[]): void {
    const spawn = room.find(FIND_MY_SPAWNS).find(candidate => !candidate.spawning);
    if (!spawn) {
      return;
    }

    const creeps = Object.values(Game.creeps).filter(creep => creep.memory.homeRoom === room.name);
    const profile = this.selectProfile(snapshot, demands, creeps);
    if (!profile) {
      return;
    }

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

  private selectProfile(snapshot: RoomSnapshot, demands: Demand[], creeps: Creep[]): BodyProfile | undefined {
    if (creeps.length === 0) {
      return "worker";
    }

    const minerCount = this.countProfile(creeps, "miner");
    const haulerCount = this.countProfile(creeps, "hauler");
    const workerCount = this.countProfile(creeps, "worker");

    if (minerCount < snapshot.sources.length) {
      return "miner";
    }

    const hasPortableEnergy = snapshot.droppedEnergy.length > 0 || snapshot.energyStores.length > 0;
    const hasFillDemand = demands.some(demand => demand.kind === "fill");
    const desiredHaulers = hasPortableEnergy && hasFillDemand ? 1 : 0;

    if (haulerCount < desiredHaulers) {
      return "hauler";
    }

    const hasWorkDemand = demands.some(demand => demand.kind === "build" || demand.kind === "repair" || demand.kind === "upgrade");
    const desiredWorkers = hasWorkDemand ? 1 : 0;

    if (workerCount < desiredWorkers) {
      return "worker";
    }

    return undefined;
  }

  private countProfile(creeps: Creep[], profile: BodyProfile): number {
    return creeps.filter(creep => creep.memory.bodyProfile === profile).length;
  }

  private bodyCost(body: BodyPartConstant[]): number {
    return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
  }
}
