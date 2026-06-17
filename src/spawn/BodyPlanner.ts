import type { BodyProfile } from "../tasks/Task";

export class BodyPlanner {
  public build(profile: BodyProfile, energyCapacity: number): BodyPartConstant[] {
    switch (profile) {
      case "miner":
        return this.miner(energyCapacity);
      case "hauler":
        return this.hauler(energyCapacity);
      case "worker":
        return this.worker(energyCapacity);
    }
  }

  private worker(energyCapacity: number): BodyPartConstant[] {
    if (energyCapacity < 300) {
      return [WORK, CARRY, MOVE];
    }

    const body: BodyPartConstant[] = [];
    let remaining = Math.min(energyCapacity, 800);

    while (remaining >= 200 && body.length <= 45) {
      body.push(WORK, CARRY, MOVE);
      remaining -= 200;
    }

    return body.length > 0 ? body : [WORK, CARRY, MOVE];
  }

  private miner(energyCapacity: number): BodyPartConstant[] {
    if (energyCapacity < 300) {
      return [WORK, CARRY, MOVE];
    }

    const body: BodyPartConstant[] = [CARRY, MOVE];
    let remaining = Math.min(energyCapacity - 100, 600);

    while (remaining >= 100 && body.length < 50) {
      body.unshift(WORK);
      remaining -= 100;
    }

    return body;
  }

  private hauler(energyCapacity: number): BodyPartConstant[] {
    if (energyCapacity < 300) {
      return [CARRY, CARRY, MOVE];
    }

    const body: BodyPartConstant[] = [];
    let remaining = Math.min(energyCapacity, 600);

    while (remaining >= 150 && body.length <= 47) {
      body.push(CARRY, CARRY, MOVE);
      remaining -= 150;
    }

    return body.length > 0 ? body : [CARRY, CARRY, MOVE];
  }
}
