export type TaskType =
  | "harvest"
  | "transfer"
  | "withdraw"
  | "pickup"
  | "upgrade"
  | "build"
  | "repair";

export type BodyProfile = "miner" | "hauler" | "worker";

export type RoomMode = "bootstrap" | "economy" | "buildout" | "upgrade" | "defense" | "recovery";

export interface CreepCapabilities {
  work?: number;
  carry?: number;
  move?: number;
}

export interface TaskMemory {
  id: string;
  roomName: string;
  type: TaskType;
  targetId: string;
  priority: number;
  assignedTo?: string;
  resourceType?: ResourceConstant;
  amount?: number;
  createdAt: number;
  expiresAt: number;
  requirements: CreepCapabilities;
}

export interface Demand {
  id: string;
  roomName: string;
  kind: "mine" | "fill" | "upgrade" | "build" | "repair";
  priority: number;
  targetId: string;
  expiresAt: number;
}
