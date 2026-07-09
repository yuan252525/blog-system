import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AvatarState } from './commandParser';

function Body({ state }: { state: AvatarState }) {
  const base = state.color === 'rainbow' ? '#ffffff' : state.color;
  const Mat = () => <meshStandardMaterial color={base} />;

  switch (state.shape) {
    case 'human':
      return (
        <>
          <mesh position={[0, 0.3, 0]} castShadow>
            <capsuleGeometry args={[0.4, 0.8, 8, 16]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.25, 0]} castShadow>
            <sphereGeometry args={[0.35, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[-0.55, 0.4, 0]} rotation={[0, 0, 0.35]} castShadow>
            <capsuleGeometry args={[0.12, 0.6, 4, 8]} />
            <Mat />
          </mesh>
          <mesh position={[0.55, 0.4, 0]} rotation={[0, 0, -0.35]} castShadow>
            <capsuleGeometry args={[0.12, 0.6, 4, 8]} />
            <Mat />
          </mesh>
          <group name="legL" position={[-0.2, -0.5, 0]}>
            <mesh position={[0, -0.32, 0]} castShadow>
              <capsuleGeometry args={[0.14, 0.5, 4, 8]} />
              <Mat />
            </mesh>
          </group>
          <group name="legR" position={[0.2, -0.5, 0]}>
            <mesh position={[0, -0.32, 0]} castShadow>
              <capsuleGeometry args={[0.14, 0.5, 4, 8]} />
              <Mat />
            </mesh>
          </group>
        </>
      );
    case 'cat':
      return (
        <>
          <mesh position={[0, 0.35, 0]} castShadow>
            <sphereGeometry args={[0.6, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.05, 0.05]} castShadow>
            <sphereGeometry args={[0.38, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[-0.22, 1.4, 0]} rotation={[0, 0, 0.3]} castShadow>
            <coneGeometry args={[0.16, 0.32, 8]} />
            <Mat />
          </mesh>
          <mesh position={[0.22, 1.4, 0]} rotation={[0, 0, -0.3]} castShadow>
            <coneGeometry args={[0.16, 0.32, 8]} />
            <Mat />
          </mesh>
          <mesh position={[0, 0.4, 0.62]} rotation={[0.7, 0, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
            <Mat />
          </mesh>
          <group name="legL" position={[-0.3, -0.2, 0.12]}>
            <mesh position={[0, -0.35, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.7, 4, 8]} />
              <Mat />
            </mesh>
          </group>
          <group name="legR" position={[0.3, -0.2, 0.12]}>
            <mesh position={[0, -0.35, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.7, 4, 8]} />
              <Mat />
            </mesh>
          </group>
        </>
      );
    case 'dog':
      return (
        <>
          <mesh position={[0, 0.4, 0]} castShadow>
            <sphereGeometry args={[0.6, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.1, 0.15]} castShadow>
            <sphereGeometry args={[0.4, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.05, 0.55]} rotation={[1.2, 0, 0]} castShadow>
            <boxGeometry args={[0.25, 0.3, 0.3]} />
            <Mat />
          </mesh>
          <mesh position={[0, 0.4, 0.62]} rotation={[0.7, 0, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.7, 8]} />
            <Mat />
          </mesh>
          <group name="legL" position={[-0.32, -0.15, 0.12]}>
            <mesh position={[0, -0.38, 0]} castShadow>
              <capsuleGeometry args={[0.11, 0.75, 4, 8]} />
              <Mat />
            </mesh>
          </group>
          <group name="legR" position={[0.32, -0.15, 0.12]}>
            <mesh position={[0, -0.38, 0]} castShadow>
              <capsuleGeometry args={[0.11, 0.75, 4, 8]} />
              <Mat />
            </mesh>
          </group>
        </>
      );
    case 'rabbit':
      return (
        <>
          <mesh position={[0, 0.4, 0]} castShadow>
            <sphereGeometry args={[0.55, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.05, 0.05]} castShadow>
            <sphereGeometry args={[0.38, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[-0.16, 1.62, 0]} rotation={[0.1, 0, 0.1]} castShadow>
            <capsuleGeometry args={[0.07, 0.5, 4, 8]} />
            <Mat />
          </mesh>
          <mesh position={[0.16, 1.62, 0]} rotation={[0.1, 0, -0.1]} castShadow>
            <capsuleGeometry args={[0.07, 0.5, 4, 8]} />
            <Mat />
          </mesh>
          <mesh position={[0, 0.45, -0.55]} castShadow>
            <sphereGeometry args={[0.18, 16, 16]} />
            <Mat />
          </mesh>
          <group name="legL" position={[-0.28, -0.12, 0.12]}>
            <mesh position={[0, -0.4, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.8, 4, 8]} />
              <Mat />
            </mesh>
          </group>
          <group name="legR" position={[0.28, -0.12, 0.12]}>
            <mesh position={[0, -0.4, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.8, 4, 8]} />
              <Mat />
            </mesh>
          </group>
        </>
      );
    case 'fox':
      return (
        <>
          <mesh position={[0, 0.45, 0]} castShadow>
            <sphereGeometry args={[0.55, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.0, 0.1]} castShadow>
            <sphereGeometry args={[0.4, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[-0.22, 1.42, 0]} rotation={[0, 0, 0.25]} castShadow>
            <coneGeometry args={[0.16, 0.34, 8]} />
            <Mat />
          </mesh>
          <mesh position={[0.22, 1.42, 0]} rotation={[0, 0, -0.25]} castShadow>
            <coneGeometry args={[0.16, 0.34, 8]} />
            <Mat />
          </mesh>
          <mesh position={[0, 0.45, -0.72]} rotation={[0.6, 0, 0]} castShadow>
            <coneGeometry args={[0.22, 0.95, 12]} />
            <Mat />
          </mesh>
          <mesh position={[0, 0.2, -1.0]} castShadow>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <group name="legL" position={[-0.28, -0.08, 0.12]}>
            <mesh position={[0, -0.4, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.8, 4, 8]} />
              <Mat />
            </mesh>
          </group>
          <group name="legR" position={[0.28, -0.08, 0.12]}>
            <mesh position={[0, -0.4, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.8, 4, 8]} />
              <Mat />
            </mesh>
          </group>
        </>
      );
    case 'bear':
      return (
        <>
          <mesh position={[0, 0.5, 0]} castShadow>
            <sphereGeometry args={[0.6, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.15, 0.1]} castShadow>
            <sphereGeometry args={[0.4, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[-0.26, 1.5, 0]} castShadow>
            <sphereGeometry args={[0.16, 16, 16]} />
            <Mat />
          </mesh>
          <mesh position={[0.26, 1.5, 0]} castShadow>
            <sphereGeometry args={[0.16, 16, 16]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.08, 0.45]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.18, 12]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <group name="legL" position={[-0.3, -0.05, 0.12]}>
            <mesh position={[0, -0.42, 0]} castShadow>
              <capsuleGeometry args={[0.12, 0.85, 4, 8]} />
              <Mat />
            </mesh>
          </group>
          <group name="legR" position={[0.3, -0.05, 0.12]}>
            <mesh position={[0, -0.42, 0]} castShadow>
              <capsuleGeometry args={[0.12, 0.85, 4, 8]} />
              <Mat />
            </mesh>
          </group>
        </>
      );
    case 'pig':
      return (
        <>
          <mesh position={[0, 0.5, 0]} castShadow>
            <sphereGeometry args={[0.58, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.1, 0.1]} castShadow>
            <sphereGeometry args={[0.38, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.05, 0.46]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.2, 16]} />
            <Mat />
          </mesh>
          <mesh position={[-0.24, 1.42, 0]} rotation={[0, 0, 0.35]} castShadow>
            <coneGeometry args={[0.13, 0.22, 4]} />
            <Mat />
          </mesh>
          <mesh position={[0.24, 1.42, 0]} rotation={[0, 0, -0.35]} castShadow>
            <coneGeometry args={[0.13, 0.22, 4]} />
            <Mat />
          </mesh>
          <group name="legL" position={[-0.3, -0.03, 0.12]}>
            <mesh position={[0, -0.42, 0]} castShadow>
              <capsuleGeometry args={[0.11, 0.85, 4, 8]} />
              <Mat />
            </mesh>
          </group>
          <group name="legR" position={[0.3, -0.03, 0.12]}>
            <mesh position={[0, -0.42, 0]} castShadow>
              <capsuleGeometry args={[0.11, 0.85, 4, 8]} />
              <Mat />
            </mesh>
          </group>
        </>
      );
    case 'penguin':
      return (
        <>
          <mesh position={[0, 0.6, 0]} scale={[1, 1.2, 1]} castShadow>
            <sphereGeometry args={[0.5, 24, 24]} />
            <Mat />
          </mesh>
          <mesh position={[0, 0.56, 0.34]} scale={[1, 1.2, 0.5]} castShadow>
            <sphereGeometry args={[0.34, 20, 20]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0, 1.25, 0]} castShadow>
            <sphereGeometry args={[0.32, 20, 20]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.2, 0.34]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.09, 0.2, 8]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
          <mesh position={[-0.46, 0.6, 0]} rotation={[0, 0, 0.3]} castShadow>
            <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
            <Mat />
          </mesh>
          <mesh position={[0.46, 0.6, 0]} rotation={[0, 0, -0.3]} castShadow>
            <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
            <Mat />
          </mesh>
          <group name="legL" position={[-0.18, 0.1, 0.22]}>
            <mesh position={[0, -0.06, 0]} castShadow>
              <boxGeometry args={[0.2, 0.08, 0.3]} />
              <meshStandardMaterial color="#f97316" />
            </mesh>
          </group>
          <group name="legR" position={[0.18, 0.1, 0.22]}>
            <mesh position={[0, -0.06, 0]} castShadow>
              <boxGeometry args={[0.2, 0.08, 0.3]} />
              <meshStandardMaterial color="#f97316" />
            </mesh>
          </group>
        </>
      );
    case 'robot':
      return (
        <>
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.9, 0.7]} />
            <Mat />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[0.5, 0.4, 0.5]} />
            <Mat />
          </mesh>
          <mesh position={[0, 1.12, 0]} castShadow>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
          <group name="legL" position={[-0.22, -0.45, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              <boxGeometry args={[0.22, 0.6, 0.3]} />
              <Mat />
            </mesh>
          </group>
          <group name="legR" position={[0.22, -0.45, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              <boxGeometry args={[0.22, 0.6, 0.3]} />
              <Mat />
            </mesh>
          </group>
        </>
      );
    case 'tree':
      return (
        <>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.26, 1.0, 12]} />
            <meshStandardMaterial color="#8b5a2b" />
          </mesh>
          <mesh position={[0, 1.15, 0]} castShadow>
            <sphereGeometry args={[0.7, 24, 24]} />
            <meshStandardMaterial color={base === '#ffffff' ? '#22c55e' : base} />
          </mesh>
        </>
      );
    case 'ball':
      return (
        <mesh castShadow>
          <sphereGeometry args={[0.8, 32, 32]} />
          <Mat />
        </mesh>
      );
    case 'cube':
      return (
        <mesh castShadow>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <Mat />
        </mesh>
      );
    case 'star':
      return (
        <mesh castShadow>
          <octahedronGeometry args={[0.95, 0]} />
          <meshStandardMaterial color={base} flatShading />
        </mesh>
      );
    default:
      return null;
  }
}

export function Avatar({
  state,
  position = [0, 0, 0],
  label,
  attackAt,
  hitAt,
  rot,
  moving,
}: {
  state: AvatarState;
  position?: [number, number, number];
  label?: string;
  attackAt?: number;
  hitAt?: number;
  rot?: number;
  moving?: boolean;
}) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const curRot = useRef(rot ?? 0);
  const walkPhase = useRef(0);
  const curBob = useRef(0);

  useFrame((_, delta) => {
    const o = outer.current;
    const g = inner.current;
    if (!o || !g) return;
    t.current += delta;

    const [bx, by, bz] = position;
    const isMoving = !!moving;
    const targetRot = typeof rot === 'number' ? rot : curRot.current;

    // 平滑转向：朝向移动方向
    let diff = targetRot - curRot.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    curRot.current += diff * Math.min(1, delta * 12);
    o.position.set(bx, by, bz);
    o.rotation.y = curRot.current;

    // 步行相位 + 上下起伏
    if (isMoving) walkPhase.current += delta * 10;
    const targetBob = isMoving ? Math.abs(Math.sin(walkPhase.current)) * 0.12 : 0;
    curBob.current += (targetBob - curBob.current) * Math.min(1, delta * 14);

    // 动作叠加旋转（非移动动画时）
    let actRotY = 0;
    switch (state.action) {
      case 'spin':
        actRotY = t.current * 3;
        break;
      case 'dance':
        actRotY = Math.sin(t.current * 4) * 0.6;
        break;
      case 'wave':
        actRotY = Math.sin(t.current * 2) * 0.3;
        break;
    }
    g.rotation.y = actRotY;

    // 跳跃 / 跳舞的额外高度
    let extraY = 0;
    if (state.action === 'jump') extraY += Math.abs(Math.sin(t.current * 6)) * 1.2;
    if (state.action === 'dance') extraY += Math.abs(Math.sin(t.current * 4)) * 0.4;

    // 攻击：朝本地 -z（前方向）前冲 + 放大脉冲
    const atkT = attackAt ? (Date.now() - attackAt) / 1000 : 99;
    let extraZ = 0;
    let scaleMul = 1;
    if (atkT < 0.35) {
      const p = Math.sin((atkT / 0.35) * Math.PI);
      extraZ -= p * 0.9;
      scaleMul += 0.2 * p;
    }

    // 受击抖动
    const hitT = hitAt ? (Date.now() - hitAt) / 1000 : 99;
    let shake = 0;
    if (hitT < 0.35) shake = (Math.random() - 0.5) * 0.18 * (1 - hitT / 0.35);

    g.position.set(shake, 0.2 + curBob.current + extraY, extraZ);
    g.scale.setScalar(state.scale * scaleMul);

    // 腿部前后摆动（行走）
    const swing = isMoving ? Math.sin(walkPhase.current) * 0.7 : 0;
    o.traverse((obj) => {
      if (obj.name === 'legL') obj.rotation.x = swing;
      else if (obj.name === 'legR') obj.rotation.x = -swing;
    });

    // 彩虹色
    if (state.color === 'rainbow') {
      const hue = (t.current * 0.15) % 1;
      g.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        const m = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (m && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          (m as THREE.MeshStandardMaterial).color.setHSL(hue, 0.7, 0.55);
        }
      });
    }

    // 受击红色光环
    if (halo.current) {
      const m = halo.current.material as THREE.MeshBasicMaterial;
      const vis = hitT < 0.35;
      halo.current.visible = vis;
      if (vis) m.opacity = 0.55 * (1 - hitT / 0.35);
    }
  });

  return (
    <group ref={outer} position={[position[0], position[1], position[2]]}>
      <group ref={inner} scale={state.scale}>
        <Body state={state} />
        <mesh ref={halo} visible={false}>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial color="#ff2d2d" transparent opacity={0} depthWrite={false} />
        </mesh>
        {label && (
          <Html position={[0, 1.9, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div className="whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white shadow">
              {label}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
