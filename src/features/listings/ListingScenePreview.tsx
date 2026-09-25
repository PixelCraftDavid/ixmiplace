import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { categoryEmoji, categoryLabel } from '../../lib/constants';
import type { ListingInput } from '../../lib/zod-schemas';

type ListingCategory = ListingInput['category'];

const CATEGORY_COPY: Record<ListingCategory, string> = {
  casa: 'Una casa para sentirte en casa',
  departamento: 'Espacios urbanos, a tu manera',
  cuarto: 'Un cuarto listo para habitar',
  terreno: 'Un espacio para construir futuro',
  local: 'El lugar para tu próximo negocio',
  hotel: 'Hospedaje y descanso en Ixmiquilpan',
  motel: 'Privacidad y comodidad para tu estancia',
};

export function ListingScenePreview({ category }: { category: ListingCategory }) {
  return (
    <aside className="overflow-hidden rounded-[28px] border border-white/10 bg-[#17221b] text-white shadow-2xl shadow-ink/20">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">Vista previa 3D</p>
          <h2 className="mt-1 text-lg font-bold">{categoryLabel(category)}</h2>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl ring-1 ring-white/10" aria-hidden="true">
          {categoryEmoji(category)}
        </span>
      </div>

      <div className="relative h-[330px] overflow-hidden bg-[radial-gradient(ellipse_at_50%_70%,rgba(117,143,100,0.2),transparent_62%),linear-gradient(180deg,#17221b_0%,#101812_100%)] sm:h-[380px]">
        <ListingScene3D category={category} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#101812]/70 to-transparent" />
      </div>

      <div className="border-t border-white/10 px-6 py-5">
        <p className="text-base font-semibold">{CATEGORY_COPY[category]}</p>
        <p className="mt-1 text-sm leading-relaxed text-white/60">
          El modelo cambia al elegir otra categoría. Es una ilustración de ambiente, no una foto del inmueble.
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-accent-200">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
          Publicar en IxmiPlace es gratis
        </div>
      </div>
    </aside>
  );
}

function ListingScene3D({ category }: { category: ListingCategory }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      container.dataset.webglUnavailable = 'true';
      const fallback = container.querySelector<HTMLElement>('[data-fallback]');
      fallback?.classList.remove('hidden');
      fallback?.classList.add('flex');
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(4.4, 3.2, 6.2);
    camera.lookAt(0, 0.15, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xf6ead2, 0x29382e, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffe0ac, 3.2);
    keyLight.position.set(-3, 6, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x91b5a0, 2.2);
    rimLight.position.set(4, 3, -4);
    scene.add(rimLight);

    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(2.35, 2.48, 0.22, 64),
      new THREE.MeshStandardMaterial({ color: 0x34483a, roughness: 0.86, metalness: 0.08 })
    );
    stage.position.y = -0.82;
    scene.add(stage);
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(2.39, 0.025, 8, 64),
      new THREE.MeshStandardMaterial({ color: 0xd49a4a, emissive: 0x6b3b10, emissiveIntensity: 0.45 })
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = -0.69;
    scene.add(trim);

    const model = new THREE.Group();
    scene.add(model);
    const matte = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
    const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matte(color));
      mesh.position.set(x, y, z);
      model.add(mesh);
      return mesh;
    };
    const glow = new THREE.MeshStandardMaterial({
      color: 0xffd58a,
      emissive: 0xffad49,
      emissiveIntensity: 1.15,
      roughness: 0.45,
    });
    const windowBox = (x: number, y: number, z: number, w = 0.22, h = 0.28) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.035), glow);
      mesh.position.set(x, y, z);
      model.add(mesh);
    };
    const ground = (color = 0x718761) => box(2.9, 0.08, 2.2, color, 0, -0.68, 0);

    if (category === 'casa') {
      ground();
      box(1.9, 1.25, 1.55, 0xe7dbc2, 0, -0.02, 0);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.94, 4), matte(0x98694a));
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 1.08;
      model.add(roof);
      box(0.34, 0.68, 0.04, 0x755039, 0, -0.32, 0.8);
      windowBox(-0.57, 0.16, 0.8);
      windowBox(0.57, 0.16, 0.8);
      box(0.2, 0.58, 0.2, 0x705b48, 0.57, 1.14, -0.26);
    } else if (category === 'departamento' || category === 'hotel') {
      ground(0x52634a);
      const hotel = category === 'hotel';
      const floors = hotel ? 4 : 3;
      const width = hotel ? 1.72 : 1.62;
      const height = floors * 0.52;
      const bottom = -0.68;
      box(width, height, 1.24, hotel ? 0xe3dac5 : 0xdcded4, 0, bottom + height / 2, 0);
      for (let floor = 0; floor < floors; floor++) {
        const y = bottom + 0.36 + floor * 0.52;
        for (let col = 0; col < 3; col++) {
          const x = (col - 1) * 0.48;
          windowBox(x, y, 0.635, 0.25, 0.29);
          box(0.31, 0.045, 0.2, hotel ? 0xb28b62 : 0x879782, x, y - 0.2, 0.75);
        }
        box(width + 0.05, 0.045, 1.31, 0xc3b79e, 0, bottom + floor * 0.52, 0);
      }
      box(0.32, 0.58, 0.05, 0x6a5138, 0, bottom + 0.29, 0.65);
      if (hotel) box(0.75, 0.18, 0.08, 0x52634a, 0, bottom + height + 0.14, 0.65);
    } else if (category === 'motel') {
      ground(0x5b7055);
      box(2.55, 0.94, 1.16, 0xe0d5bd, 0, -0.12, 0);
      box(2.7, 0.13, 1.28, 0x52634a, 0, 0.42, 0);
      for (let room = 0; room < 4; room++) {
        const x = (room - 1.5) * 0.6;
        windowBox(x - 0.1, 0.03, 0.6, 0.2, 0.25);
        box(0.28, 0.53, 0.045, 0x76543a, x + 0.17, -0.24, 0.61);
      }
      box(0.9, 0.22, 0.14, 0xd49a4a, 0, 0.78, 0.28);
      box(0.1, 0.58, 0.1, 0x5d5a48, 1.12, -0.18, -0.35);
    } else if (category === 'cuarto') {
      ground(0x6d775f);
      box(2.05, 1.8, 0.12, 0xe0d8c4, 0, 0.18, -0.65);
      box(0.12, 1.8, 1.4, 0xd0c5ac, -0.98, 0.18, 0.02);
      box(1.7, 0.12, 1.35, 0xa27b54, 0.13, -0.65, 0.05);
      box(0.98, 0.25, 1.22, 0x758f80, 0.16, -0.46, 0.08);
      box(0.43, 0.15, 0.32, 0xf1e6d0, 0.18, -0.28, -0.29);
      box(0.42, 0.46, 0.42, 0x795d41, 0.63, -0.39, -0.35);
      windowBox(-0.23, 0.47, -0.57, 0.38, 0.44);
    } else if (category === 'local') {
      ground(0x52634a);
      box(2.1, 1.38, 1.48, 0xe8dec8, 0, -0.01, 0);
      box(2.22, 0.19, 1.6, 0x52634a, 0, 0.78, 0);
      box(0.76, 0.8, 0.05, 0x6d897e, -0.55, -0.19, 0.77);
      box(0.76, 0.8, 0.05, 0x6d897e, 0.55, -0.19, 0.77);
      box(0.35, 0.75, 0.05, 0x76543a, 0, -0.22, 0.79);
      box(2.22, 0.14, 0.76, 0xd49a4a, 0, 0.45, 0.9);
      for (let i = 0; i < 5; i++) box(0.32, 0.16, 0.78, i % 2 ? 0xf5e8cb : 0x52634a, -0.8 + i * 0.4, 0.29, 0.91);
    } else {
      ground(0x738a58);
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.72;
        box(0.055, 0.5 + (i % 2) * 0.16, 1.72, 0xe9d9b7, x, -0.61, 0);
      }
      for (const [x, z] of [[-0.9, -0.48], [0.92, 0.44]] as const) {
        box(0.12, 0.8, 0.12, 0x70543a, x, -0.28, z);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.43, 0.9, 7), matte(0x496849));
        crown.position.set(x, 0.48, z);
        model.add(crown);
      }
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId = 0;
    const resizeObserver = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
      renderer.render(scene, camera);
    });
    resizeObserver.observe(container);

    if (reducedMotion) {
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.render(scene, camera);
    } else {
      const animate = () => {
        model.rotation.y = Math.sin(performance.now() * 0.00025) * 0.09;
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, [category]);

  return (
    <div ref={mountRef} className="absolute inset-0" role="img" aria-label={`Ilustración 3D de ${categoryLabel(category)}`}>
      <div className="absolute inset-0 hidden items-center justify-center text-7xl" data-fallback>
        {categoryEmoji(category)}
      </div>
    </div>
  );
}
