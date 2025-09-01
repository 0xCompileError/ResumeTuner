// Minimal ambient declarations to satisfy TypeScript for three.js imports
// without requiring full upstream typings in CI.

declare module 'three' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const THREE: any;
  export = THREE;
}

declare module 'three/examples/jsm/controls/OrbitControls.js' {
  export class OrbitControls {
    constructor(object: any, domElement?: HTMLElement);
    dispose(): void;
    update(): void;
    enableDamping: boolean;
    dampingFactor: number;
    minDistance: number;
    maxDistance: number;
  }
}

