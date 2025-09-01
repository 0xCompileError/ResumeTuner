import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function ThreeCameraDemo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let stopped = false;
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = Math.max(220, Math.floor(width * 0.45));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
    camera.position.set(400, 200, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setAnimationLoop(animate);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 200;
    controls.maxDistance = 700;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 1, 1);
    scene.add(dir);

    // Objects (inspired by webgl_camera example)
    const geometry = new THREE.BoxGeometry(20, 20, 20);
    for (let i = 0; i < 200; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
        metalness: 0.1,
        roughness: 0.7,
      });
      const object = new THREE.Mesh(geometry, material);
      object.position.x = Math.random() * 800 - 400;
      object.position.y = Math.random() * 400 - 200;
      object.position.z = Math.random() * 800 - 400;
      object.rotation.x = Math.random() * 2 * Math.PI;
      object.rotation.y = Math.random() * 2 * Math.PI;
      object.rotation.z = Math.random() * 2 * Math.PI;
      object.scale.setScalar(Math.random() * 2 + 1);
      scene.add(object);
    }

    // Resize handling
    function onResize() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = Math.max(220, Math.floor(w * 0.45));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    let t = 0;
    function animate() {
      if (stopped) return;
      t += 0.003;
      // Slow orbital camera path
      camera.position.x = 400 * Math.cos(t);
      camera.position.z = 400 * Math.sin(t);
      camera.lookAt(0, 0, 0);
      controls.update();
      renderer.render(scene, camera);
    }

    onResize();

    cleanupRef.current = () => {
      stopped = true;
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };

    return () => cleanupRef.current?.();
  }, []);

  return <div className="three-wrap" ref={containerRef} aria-label="3D camera demo" />;
}
