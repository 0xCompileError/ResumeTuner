import { useEffect, useRef } from "react";

export default function WebglCameraExample() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let stopped = false;
    (async () => {
      try {
        const THREE: any = await import(
          "https://unpkg.com/three@0.154.0/build/three.module.js"
        );

        if (!containerRef.current || stopped) return;

        let width = containerRef.current.clientWidth;
        let height = Math.max(240, Math.floor(width * 0.5));
        let aspect = width / height;

        const scene = new THREE.Scene();

        // Perspective and orthographic cameras (toggle with P/O)
        const cameraPerspective = new THREE.PerspectiveCamera(50, aspect, 150, 1000);
        const frustumSize = 600;
        const cameraOrtho = new THREE.OrthographicCamera(
          (frustumSize * aspect) / -2,
          (frustumSize * aspect) / 2,
          frustumSize / 2,
          frustumSize / -2,
          150,
          1000
        );

        // counteract different front orientation of cameras vs rig
        cameraOrtho.rotation.y = Math.PI;
        cameraPerspective.rotation.y = Math.PI;

        let activeCamera: any = cameraPerspective;

        const cameraRig = new THREE.Group();
        cameraRig.add(cameraPerspective);
        cameraRig.add(cameraOrtho);
        scene.add(cameraRig);

        // Objects
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(100, 16, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
        );
        scene.add(mesh);

        const mesh2 = new THREE.Mesh(
          new THREE.SphereGeometry(50, 16, 8),
          new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
        );
        mesh2.position.y = 150;
        mesh.add(mesh2);

        const mesh3 = new THREE.Mesh(
          new THREE.SphereGeometry(5, 16, 8),
          new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true })
        );
        mesh3.position.z = 150;
        cameraRig.add(mesh3);

        const geometry = new THREE.BufferGeometry();
        const vertices: number[] = [];
        for (let i = 0; i < 10000; i++) {
          vertices.push(THREE.MathUtils.randFloatSpread(2000));
          vertices.push(THREE.MathUtils.randFloatSpread(2000));
          vertices.push(THREE.MathUtils.randFloatSpread(2000));
        }
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        const particles = new THREE.Points(
          geometry,
          new THREE.PointsMaterial({ color: 0x888888 })
        );
        scene.add(particles);

        // Renderer (single full-canvas viewport)
        // Clear any previous children (handles React StrictMode double-invoke in dev)
        try {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild as Node);
          }
        } catch {}

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        renderer.setAnimationLoop(animate);
        renderer.setClearColor(0x000000, 1);
        if (!stopped) {
          containerRef.current.appendChild(renderer.domElement);
        }

        function onResize() {
          if (!containerRef.current) return;
          width = containerRef.current.clientWidth;
          height = Math.max(240, Math.floor(width * 0.5));
          aspect = width / height;

          renderer.setSize(width, height);

          cameraPerspective.aspect = aspect;
          cameraPerspective.updateProjectionMatrix();

          cameraOrtho.left = (-frustumSize * aspect) / 2;
          cameraOrtho.right = (frustumSize * aspect) / 2;
          cameraOrtho.top = frustumSize / 2;
          cameraOrtho.bottom = -frustumSize / 2;
          cameraOrtho.updateProjectionMatrix();
        }

        function onKeyDown(event: KeyboardEvent) {
          switch (event.key.toLowerCase()) {
            case "o":
              activeCamera = cameraOrtho;
              break;
            case "p":
              activeCamera = cameraPerspective;
              break;
          }
        }

        window.addEventListener("resize", onResize);
        window.addEventListener("keydown", onKeyDown);

        function animate() {
          if (stopped) return;
          render();
        }

        function render() {
          const r = Date.now() * 0.0005;
          mesh.position.x = 700 * Math.cos(r);
          mesh.position.z = 700 * Math.sin(r);
          mesh.position.y = 700 * Math.sin(r);

          (mesh.children[0] as any).position.x = 70 * Math.cos(2 * r);
          (mesh.children[0] as any).position.z = 70 * Math.sin(r);

          if (activeCamera === cameraPerspective) {
            cameraPerspective.fov = 35 + 30 * Math.sin(0.5 * r);
            cameraPerspective.far = mesh.position.length();
            cameraPerspective.updateProjectionMatrix();
          } else {
            cameraOrtho.far = mesh.position.length();
            cameraOrtho.updateProjectionMatrix();
          }

          cameraRig.lookAt(mesh.position);
          renderer.render(scene, activeCamera);
        }

        onResize();

        cleanupRef.current = () => {
          stopped = true;
          window.removeEventListener("resize", onResize);
          window.removeEventListener("keydown", onKeyDown);
          renderer.dispose();
          if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        };
      } catch (e) {
        // fail silently if CDN blocked
      }
    })();

    return () => cleanupRef.current?.();
  }, []);

  return (
    <div
      className="three-wrap"
      ref={containerRef}
      aria-label="three.js camera demo"
      style={{ marginTop: 8 }}
    />
  );
}
