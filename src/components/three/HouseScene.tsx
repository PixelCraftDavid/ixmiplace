import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Casa 3D con una iluminación que acompaña el tema de la página:
 * luz cálida y luciérnagas por la noche; cielo abierto y luz de día en tema claro.
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
    const ambient = new THREE.AmbientLight(0xc6d1d3, 0.6);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xaac8ff, 0.8);
    keyLight.position.set(-4, 6, 3);
    scene.add(keyLight);

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

    const palettes = {
      day: {
        ambientColor: new THREE.Color(0xfff1d8),
        ambientIntensity: 1.65,
        keyColor: new THREE.Color(0xfff3df),
        keyIntensity: 1.75,
        ground: new THREE.Color(0x87a96d),
        walls: new THREE.Color(0xf0dfbd),
        roof: new THREE.Color(0x9b6040),
        door: new THREE.Color(0x68462e),
        chimney: new THREE.Color(0x8c7565),
        window: new THREE.Color(0xffe6ae),
        windowEmissive: new THREE.Color(0x000000),
        windowEmissiveIntensity: 0,
        glowIntensity: 0.08,
        particles: new THREE.Color(0xfff7de),
        particleOpacity: 0.08,
      },
      night: {
        ambientColor: new THREE.Color(0x8899aa),
        ambientIntensity: 0.6,
        keyColor: new THREE.Color(0xaac8ff),
        keyIntensity: 0.8,
        ground: new THREE.Color(0x4c6b4f),
        walls: new THREE.Color(0x9a9d99),
        roof: new THREE.Color(0x624333),
        door: new THREE.Color(0x3f2c20),
        chimney: new THREE.Color(0x62564e),
        window: new THREE.Color(0xffd98a),
        windowEmissive: new THREE.Color(0xffb648),
        windowEmissiveIntensity: 1.1,
        glowIntensity: 1.1,
        particles: new THREE.Color(0xffd98a),
        particleOpacity: 0.8,
      },
    };

    let isDarkMode = document.documentElement.classList.contains('dark');
    let palette = isDarkMode ? palettes.night : palettes.day;

    function selectPalette() {
      isDarkMode = document.documentElement.classList.contains('dark');
      palette = isDarkMode ? palettes.night : palettes.day;
    }

    selectPalette();
    const themeObserver = new MutationObserver(selectPalette);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // ───────── Animación ─────────
    // 🔧 FIX: en vez de THREE.Clock (deprecado), calculamos el tiempo
    // transcurrido manualmente con performance.now().
    let frameId: number;
    const startTime = performance.now();
    let previousFrame = startTime;

    function animate() {
      const now = performance.now();
      const t = (now - startTime) / 1000;
      const delta = Math.min((now - previousFrame) / 1000, 0.1);
      previousFrame = now;
      house.rotation.y = t * 0.25;
      particles.rotation.y = t * 0.04;
      const blend = 1 - Math.exp(-delta * 3.5);
      ambient.color.lerp(palette.ambientColor, blend);
      ambient.intensity += (palette.ambientIntensity - ambient.intensity) * blend;
      keyLight.color.lerp(palette.keyColor, blend);
      keyLight.intensity += (palette.keyIntensity - keyLight.intensity) * blend;
      groundMat.color.lerp(palette.ground, blend);
      wallsMat.color.lerp(palette.walls, blend);
      roofMat.color.lerp(palette.roof, blend);
      doorMat.color.lerp(palette.door, blend);
      chimneyMat.color.lerp(palette.chimney, blend);
      windowMat.color.lerp(palette.window, blend);
      windowMat.emissive.lerp(palette.windowEmissive, blend);
      windowMat.emissiveIntensity += (palette.windowEmissiveIntensity - windowMat.emissiveIntensity) * blend;
      particleMat.color.lerp(palette.particles, blend);
      particleMat.opacity += (palette.particleOpacity - particleMat.opacity) * blend;
      windowGlow.intensity += (palette.glowIntensity - windowGlow.intensity) * blend;
      if (isDarkMode) windowGlow.intensity += Math.sin(t * 3) * 0.015;
      windowMat.needsUpdate = true;
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
      themeObserver.disconnect();
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
