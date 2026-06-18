import { describe, it, expect, beforeEach } from "vitest";
import { TaskFactory } from "../../src/tasks/TaskFactory";
import type { Demand } from "../../src/tasks/Task";

const demand = (overrides?: Partial<Demand>): Demand => ({
  id: "W1N1:mine:s1",
  roomName: "W1N1",
  kind: "mine",
  priority: 900,
  targetId: "s1",
  expiresAt: 510,
  ...overrides,
});

describe("TaskFactory", () => {
  const factory = new TaskFactory();

  beforeEach(() => {
    Game.time = 500;
  });

  it("maps mine to harvest with work+move requirements", () => {
    const task = factory.fromDemand(demand());
    expect(task).toMatchObject({
      id: "task:W1N1:mine:s1",
      roomName: "W1N1",
      type: "harvest",
      targetId: "s1",
      priority: 900,
      createdAt: 500,
      expiresAt: 510,
      requirements: { work: 1, carry: 0, move: 1 },
    });
  });

  it("maps pickup to pickup with carry+move requirements and energy resource", () => {
    const task = factory.fromDemand(demand({ kind: "pickup", priority: 850, id: "W1N1:pickup:r1", targetId: "r1" }));
    expect(task).toMatchObject({
      id: "task:W1N1:pickup:r1",
      type: "pickup",
      resourceType: "energy",
      requirements: { carry: 1, move: 1 },
    });
  });

  it("maps withdraw to withdraw with carry+move requirements", () => {
    const task = factory.fromDemand(demand({ kind: "withdraw", priority: 825, id: "W1N1:withdraw:t1", targetId: "t1" }));
    expect(task).toMatchObject({
      id: "task:W1N1:withdraw:t1",
      type: "withdraw",
      resourceType: "energy",
      requirements: { carry: 1, move: 1 },
    });
  });

  it("maps fill to transfer with carry+move requirements", () => {
    const task = factory.fromDemand(demand({ kind: "fill", priority: 800, id: "W1N1:fill:sp1", targetId: "sp1" }));
    expect(task).toMatchObject({
      id: "task:W1N1:fill:sp1",
      type: "transfer",
      resourceType: "energy",
      requirements: { carry: 1, move: 1 },
    });
  });

  it("maps build to build with work+carry+move requirements", () => {
    const task = factory.fromDemand(demand({ kind: "build", priority: 500, id: "W1N1:build:c1", targetId: "c1" }));
    expect(task).toMatchObject({
      id: "task:W1N1:build:c1",
      type: "build",
      requirements: { work: 1, carry: 1, move: 1 },
    });
  });

  it("maps repair to repair with work+carry+move requirements", () => {
    const task = factory.fromDemand(demand({ kind: "repair", priority: 450, id: "W1N1:repair:d1", targetId: "d1" }));
    expect(task).toMatchObject({
      id: "task:W1N1:repair:d1",
      type: "repair",
      requirements: { work: 1, carry: 1, move: 1 },
    });
  });

  it("maps upgrade to upgrade with work+carry+move requirements", () => {
    const task = factory.fromDemand(demand({ kind: "upgrade", priority: 300, id: "W1N1:upgrade:controller", targetId: "controller" }));
    expect(task).toMatchObject({
      id: "task:W1N1:upgrade:controller",
      type: "upgrade",
      requirements: { work: 1, carry: 1, move: 1 },
    });
  });

  it("preserves priority from demand", () => {
    const high = factory.fromDemand(demand({ priority: 999 }));
    expect(high.priority).toBe(999);
  });

  it("does not set assignedTo on creation", () => {
    const task = factory.fromDemand(demand());
    expect(task.assignedTo).toBeUndefined();
  });
});
