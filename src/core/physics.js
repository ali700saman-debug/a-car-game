import * as CANNON from "cannon-es";

export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
      allowSleep: true,
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.defaultContactMaterial.friction = 0.35;
    this.world.defaultContactMaterial.restitution = 0.02;

    // More stable stacking for props/walls
    this.world.solver.iterations = 10;
    this.world.solver.tolerance = 0.001;

    this.fixedTimeStep = 1 / 60;
    this.maxSubSteps = 3;
  }

  step(dt) {
    this.world.step(this.fixedTimeStep, dt, this.maxSubSteps);
  }
}

