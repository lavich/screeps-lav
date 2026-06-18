import { describe, it, expect } from "vitest";
import { BodyPlanner } from "../../src/spawn/BodyPlanner";

describe("BodyPlanner", () => {
  const planner = new BodyPlanner();

  describe("build", () => {
    it("dispatches to worker for 'worker' profile", () => {
      const body = planner.build("worker", 200);
      expect(body).toEqual(["work", "carry", "move"]);
    });

    it("dispatches to miner for 'miner' profile", () => {
      const body = planner.build("miner", 200);
      expect(body).toEqual(["work", "carry", "move"]);
    });

    it("dispatches to hauler for 'hauler' profile", () => {
      const body = planner.build("hauler", 100);
      expect(body).toEqual(["carry", "carry", "move"]);
    });
  });

  describe("worker", () => {
    it("returns [WORK, CARRY, MOVE] when energy < 200", () => {
      const body = planner.build("worker", 150);
      expect(body).toEqual(["work", "carry", "move"]);
    });

    it("returns [WORK, CARRY, MOVE] for exactly 200 energy", () => {
      const body = planner.build("worker", 200);
      expect(body).toEqual(["work", "carry", "move"]);
    });

    it("adds one block per 200 energy up to 1000", () => {
      const body = planner.build("worker", 1000);
      expect(body).toHaveLength(15);
      expect(body.filter(p => p === "work").length).toBe(5);
      expect(body.filter(p => p === "carry").length).toBe(5);
      expect(body.filter(p => p === "move").length).toBe(5);
    });

    it("caps at 1000 energy", () => {
      const body = planner.build("worker", 2000);
      expect(body).toHaveLength(15);
    });

    it("returns [WORK, CARRY, MOVE] when energy is 0", () => {
      const body = planner.build("worker", 0);
      expect(body).toEqual(["work", "carry", "move"]);
    });
  });

  describe("miner", () => {
    it("returns [WORK, CARRY, MOVE] when energy < 300", () => {
      const body = planner.build("miner", 200);
      expect(body).toEqual(["work", "carry", "move"]);
    });

    it("builds correct miner body at 800 energy", () => {
      const body = planner.build("miner", 800);
      const workCount = body.filter(p => p === "work").length;
      const moveCount = body.filter(p => p === "move").length;
      expect(workCount).toBe(7);
      expect(moveCount).toBe(1);
    });

    it("places all WORKs before CARRY when possible", () => {
      const body = planner.build("miner", 800);
      const firstWorkIndex = body.indexOf("work");
      const lastCarryIndex = body.lastIndexOf("carry");
      expect(lastCarryIndex).toBeGreaterThan(firstWorkIndex);
    });

    it("adds at least one MOVE when energy allows", () => {
      const body = planner.build("miner", 800);
      expect(body.filter(p => p === "move").length).toBeGreaterThanOrEqual(1);
    });

    it("caps energy at 800", () => {
      const body = planner.build("miner", 2000);
      const body800 = planner.build("miner", 800);
      expect(body).toEqual(body800);
    });
  });

  describe("hauler", () => {
    it("returns [CARRY, CARRY, MOVE] when energy < 200", () => {
      const body = planner.build("hauler", 100);
      expect(body).toEqual(["carry", "carry", "move"]);
    });

    it("builds hauler blocks at 300 energy", () => {
      const body = planner.build("hauler", 300);
      expect(body.filter(p => p === "carry").length).toBe(4);
      expect(body.filter(p => p === "move").length).toBe(2);
    });

    it("caps at 1000 energy", () => {
      const body = planner.build("hauler", 2000);
      const body1000 = planner.build("hauler", 1000);
      expect(body).toEqual(body1000);
    });

    it("maintains at least 2:1 carry-to-move ratio", () => {
      const body = planner.build("hauler", 1000);
      const carryCount = body.filter(p => p === "carry").length;
      const moveCount = body.filter(p => p === "move").length;
      expect(moveCount * 2).toBeGreaterThanOrEqual(carryCount);
    });

    it("respects body part limit of 50", () => {
      const body = planner.build("hauler", 1000);
      expect(body.length).toBeLessThanOrEqual(50);
    });
  });
});
