import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Escena 3D de una casa low-poly de noche, con ventanas iluminadas
 * y partículas flotantes. Gira lentamente sobre su propio eje.
 * Pensada como fondo decorativo en pantallas de autenticación.
 */
export function HouseScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ───────── Escena base ─────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(4.5, 3, 6);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // ───────── Luces ─────────
    const ambient = new THREE.AmbientLight(0x8899aa, 0.6);
    scene.add(ambient);

    const moonLight = new THREE.DirectionalLight(0xaac8ff, 0.8);
    moonLight.position.set(-4, 6, 3);
    scene.add(moonLight);

    const windowGlow = new THREE.PointLight(0xffc773, 1.2, 6);
    windowGlow.position.set(0, 0.6, 1.05);
    scene.add(windowGlow);

    // ───────── Grupo casa (todo gira junto) ─────────
    const house = new THREE.Group();
    scene.add(house);

    // Base / jardín
    const groundGeo = new THREE.CircleGeometry(3.4, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4c6b4f,
      roughness: 1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.75;
    house.add(ground);

    // Paredes
    const wallsGeo = new THREE.BoxGeometry(2, 1.3, 1.8);
    const wallsMat = new THREE.MeshStandardMaterial({
      color: 0xede1c9,
      roughness: 0.9,
    });
    const walls = new THREE.Mesh(wallsGeo, wallsMat);
    walls.position.y = -0.05;
    house.add(walls);

    // Techo
    const roofGeo = new THREE.ConeGeometry(1.7, 1, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x8f5a3c,
      roughness: 0.8,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 1.1;
    house.add(roof);

    // Puerta
    const doorGeo = new THREE.PlaneGeometry(0.42, 0.75);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5b3a24 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, -0.32, 0.91);
    house.add(door);

    // Ventanas iluminadas (el "hogar habitado")
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffd98a,
      emissive: 0xffb648,
      emissiveIntensity: 1.1,
    });
    const windowGeo = new THREE.PlaneGeometry(0.32, 0.32);

    const winLeft = new THREE.Mesh(windowGeo, windowMat);
    winLeft.position.set(-0.65, 0.05, 0.91);
    house.add(winLeft);

    const winRight = new THREE.Mesh(windowGeo, windowMat);
    winRight.position.set(0.65, 0.05, 0.91);
    house.add(winRight);

    // Chimenea
    const chimneyGeo = new THREE.BoxGeometry(0.22, 0.55, 0.22);
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x7a6455 });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(0.55, 1.35, -0.2);
    house.add(chimney);

    // ───────── Partículas (luciérnagas / polvo cálido) ─────────
    const particleCount = 60;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffd98a,
      size: 0.035,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ───────── Animación ─────────
    // 🔧 FIX: en vez de THREE.Clock (deprecado), calculamos el tiempo
    // transcurrido manualmente con performance.now().
    let frameId: number;
    const startTime = performance.now();

    function animate() {
      const t = (performance.now() - startTime) / 1000; // segundos transcurridos
      house.rotation.y = t * 0.25;
      particles.rotation.y = t * 0.04;
      windowGlow.intensity = 1.1 + Math.sin(t * 3) * 0.15; // parpadeo sutil
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    // ───────── Resize responsivo ─────────
    function handleResize() {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ───────── Limpieza al desmontar ─────────
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.removeChild(renderer.domElement);

      [wallsGeo, roofGeo, doorGeo, windowGeo, chimneyGeo, groundGeo, particleGeo].forEach(
        (g) => g.dispose()
      );
      [wallsMat, roofMat, doorMat, windowMat, chimneyMat, groundMat, particleMat].forEach(
        (m) => m.dispose()
      );
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" />;
}