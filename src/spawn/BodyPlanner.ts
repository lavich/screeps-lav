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
    if (energyCapacity < 200) {
      return [WORK, CARRY, MOVE];
    }

    const body: BodyPartConstant[] = [];
    let remaining = Math.min(energyCapacity, 1000);

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

    const body: BodyPartConstant[] = [];
    let remaining = Math.min(energyCapacity, 800);

    body.push(CARRY);
    remaining -= 50;

    while (remaining >= 100 && body.length < 49) {
      body.unshift(WORK);
      remaining -= 100;
    }

    const workCount = body.filter(p => p === WORK).length;
    while (body.filter(p => p === MOVE).length < Math.ceil(workCount / 4) && remaining >= 50) {
      body.push(MOVE);
      remaining -= 50;
    }

    if (body.filter(p => p === MOVE).length === 0 && remaining >= 50) {
      body.push(MOVE);
    }

    return body;
  }

  private hauler(energyCapacity: number): BodyPartConstant[] {
    if (energyCapacity < 200) {
      return [CARRY, CARRY, MOVE];
    }

    const body: BodyPartConstant[] = [];
    let remaining = Math.min(energyCapacity, 1000);

    while (remaining >= 150 && body.length <= 47) {
      body.push(CARRY, CARRY, MOVE);
      remaining -= 150;
    }

    const carryCount = body.filter(p => p === CARRY).length;
    const moveCount = body.filter(p => p === MOVE).length;
    while (moveCount * 2 < carryCount && remaining >= 50) {
      body.push(MOVE);
      remaining -= 50;
    }

    return body.length > 0 ? body : [CARRY, CARRY, MOVE];
  }
}
