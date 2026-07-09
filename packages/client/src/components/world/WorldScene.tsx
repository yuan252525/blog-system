import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { Avatar } from './Avatar';
import type { AvatarState, BgKind } from './commandParser';
import type { RemoteUser } from '../../hooks/useWorld';
import type { SkillCast, UserStatus } from '../../api/worldSocket';
import { SKILL_BY_KEY, MAX_HP } from './skills';

const BG: Record<BgKind, string> = {
  day: '#dbeafe',
  night: '#0f172a',
  space: '#020617',
};

const FLOOR: Record<BgKind, string> = {
  day: '#cbd5e1',
  night: '#1e293b',
  space: '#0b1220',
};

// 网格地面（随人物滚动）的配色，按场景切换
const GRID: Record<BgKind, [string, string]> = {
  day: ['#94a3b8', '#e2e8f0'],
  night: ['#475569', '#1e293b'],
  space: ['#334155', '#0b1220'],
};

// ---- 固定的世界装饰物：作为移动时的视觉参照，让人往前走时“世界在动” ----
type DecorKind = 'tree' | 'rock' | 'bush' | 'flower' | 'lamp';
interface Decor {
  kind: DecorKind;
  x: number;
  z: number;
  s: number;
  color: string;
}

// 用确定性伪随机生成固定布景（每次刷新位置一致，避免抖动）
const DECOR: Decor[] = (() => {
  let seed = 987654321;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const palette = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
  const kinds: DecorKind[] = ['tree', 'tree', 'rock', 'bush', 'flower', 'flower', 'lamp'];
  const arr: Decor[] = [];
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 58 - 29;
    const z = rnd() * 58 - 29;
    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue; // 不挡出生点
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    arr.push({
      kind,
      x,
      z,
      s: 0.8 + rnd() * 0.5,
      color: palette[Math.floor(rnd() * palette.length)],
    });
  }
  return arr;
})();

function DecorMesh({ d }: { d: Decor }) {
  switch (d.kind) {
    case 'tree':
      return (
        <group position={[d.x, 0, d.z]} scale={d.s}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 1.2, 8]} />
            <meshStandardMaterial color="#7c4a21" />
          </mesh>
          <mesh position={[0, 1.6, 0]} castShadow>
            <coneGeometry args={[0.7, 1.4, 10]} />
            <meshStandardMaterial color="#2f9e44" />
          </mesh>
          <mesh position={[0, 2.3, 0]} castShadow>
            <coneGeometry args={[0.5, 1.0, 10]} />
            <meshStandardMaterial color="#37b24d" />
          </mesh>
        </group>
      );
    case 'rock':
      return (
        <mesh position={[d.x, 0.3 * d.s, d.z]} scale={d.s} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.95} />
        </mesh>
      );
    case 'bush':
      return (
        <mesh position={[d.x, 0.35 * d.s, d.z]} scale={d.s} castShadow>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshStandardMaterial color="#51cf66" roughness={0.85} />
        </mesh>
      );
    case 'flower':
      return (
        <group position={[d.x, 0, d.z]} scale={d.s}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
            <meshStandardMaterial color="#2f9e44" />
          </mesh>
          <mesh position={[0, 0.55, 0]} castShadow>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={d.color} />
          </mesh>
        </group>
      );
    case 'lamp':
    default:
      return (
        <group position={[d.x, 0, d.z]} scale={d.s}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 2, 8]} />
            <meshStandardMaterial color="#495057" />
          </mesh>
          <mesh position={[0, 2.05, 0]}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color="#ffd43b" emissive="#ffd43b" emissiveIntensity={0.9} />
          </mesh>
        </group>
      );
  }
}

// 第三人称跟随相机：视角中心始终平滑跟随自己的分身，同时允许鼠标拖拽环视
function FollowCam({ x, z }: { x: number; z: number }) {
  const controls = useRef<any>(null);
  const { camera } = useThree();
  const inited = useRef(false);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    if (!inited.current) {
      camera.position.set(x, 5, z + 9);
      c.target.set(x, 0.8, z);
      inited.current = true;
    }
    c.target.lerp(new THREE.Vector3(x, 0.8, z), 0.12);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      minDistance={4}
      maxDistance={26}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}

// 技能特效：根据技能类型渲染飞行 / 落雷 / 冰冻 / 旋风 / 治疗
function centerOf(e: SkillCast): [number, number] {
  const def = SKILL_BY_KEY[e.skill];
  if (def.type === 'aoe' || def.type === 'heal') return [e.x, e.z];
  return [e.x + Math.sin(e.rot) * def.range, e.z + Math.cos(e.rot) * def.range];
}

function SkillEffect({ e }: { e: SkillCast }) {
  const def = SKILL_BY_KEY[e.skill];
  const orbRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const boltRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const whirlRef = useRef<THREE.Mesh>(null);
  const crossRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const age = Date.now() - e.castAt;
    const show = age < def.life;
    const [bx, bz] = centerOf(e);

    // 默认全部隐藏
    if (orbRef.current) orbRef.current.visible = false;
    if (lightRef.current) lightRef.current.visible = false;
    if (boltRef.current) boltRef.current.visible = false;
    if (ringRef.current) ringRef.current.visible = false;
    if (whirlRef.current) whirlRef.current.visible = false;
    if (crossRef.current) crossRef.current.visible = false;

    if (!show) return;

    if (def.type === 'projectile') {
      // 火球 / 冰冻：飞向落点，命中后爆开
      const EXP = def.life - def.fly;
      if (age < def.fly) {
        const t = age / def.fly;
        const x = e.x + (bx - e.x) * t;
        const z = e.z + (bz - e.z) * t;
        if (orbRef.current) {
          orbRef.current.visible = true;
          orbRef.current.position.set(x, 0.9, z);
        }
        if (lightRef.current) {
          lightRef.current.visible = true;
          lightRef.current.position.set(x, 0.9, z);
        }
      } else {
        const t = (age - def.fly) / EXP;
        if (ringRef.current) {
          ringRef.current.visible = true;
          ringRef.current.position.set(bx, -0.9, bz);
          const s = 0.4 + t * 4.5;
          ringRef.current.scale.set(s, s, s);
          (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
        }
      }
    } else if (def.type === 'instant') {
      // 雷电：落点竖直落雷 + 地面光环
      const t = Math.min(1, age / def.life);
      if (boltRef.current) {
        boltRef.current.visible = true;
        boltRef.current.position.set(bx, 2, bz);
      }
      if (ringRef.current) {
        ringRef.current.visible = true;
        ringRef.current.position.set(bx, -0.9, bz);
        const s = 0.4 + t * 3;
        ringRef.current.scale.set(s, s, s);
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      }
    } else if (def.type === 'aoe') {
      // 旋风：施法者周围旋转的环
      if (whirlRef.current) {
        whirlRef.current.visible = true;
        whirlRef.current.position.set(bx, 0.6, bz);
        whirlRef.current.rotation.y += delta * 6;
        const t = Math.min(1, age / def.life);
        const s = 0.6 + t * def.radius;
        whirlRef.current.scale.set(s, s, s);
        (whirlRef.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - t);
      }
    } else {
      // 治疗：施法者头顶升起的绿色十字 + 柔光环
      const t = Math.min(1, age / def.life);
      if (crossRef.current) {
        crossRef.current.visible = true;
        crossRef.current.position.set(bx, 0.6 + t * 1.8, bz);
      }
      if (ringRef.current) {
        ringRef.current.visible = true;
        ringRef.current.position.set(bx, -0.9, bz);
        const s = 0.4 + t * 3;
        ringRef.current.scale.set(s, s, s);
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
      }
    }
  });

  return (
    <>
      <mesh ref={orbRef} visible={false}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color={def.color} emissive={def.color} emissiveIntensity={2.2} />
      </mesh>
      <pointLight ref={lightRef} visible={false} color={def.color} intensity={3} distance={9} />
      <mesh ref={boltRef} visible={false}>
        <cylinderGeometry args={[0.1, 0.28, 4, 6]} />
        <meshStandardMaterial color={def.color} emissive={def.color} emissiveIntensity={3} transparent opacity={0.9} />
      </mesh>
      <mesh ref={whirlRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.12, 8, 24]} />
        <meshBasicMaterial color={def.color} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={crossRef} visible={false}>
        <mesh>
          <boxGeometry args={[0.7, 0.22, 0.22]} />
          <meshStandardMaterial color={def.color} emissive={def.color} emissiveIntensity={1.6} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.22, 0.7, 0.22]} />
          <meshStandardMaterial color={def.color} emissive={def.color} emissiveIntensity={1.6} />
        </mesh>
      </group>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.6, 0.95, 28]} />
        <meshBasicMaterial color={def.color} transparent opacity={1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </>
  );
}

export function WorldScene({
  state,
  selfPos,
  selfUsername,
  remoteUsers,
  myHitAt,
  selfAttackAt,
  selfRot,
    selfMoving,
    effects,
    myHp,
    myStatus,
  }: {
  state: AvatarState;
  selfPos: { x: number; z: number };
  selfUsername?: string;
  remoteUsers: RemoteUser[];
  myHitAt: number;
  selfAttackAt: number;
  selfRot: number;
  selfMoving: boolean;
  effects: SkillCast[];
  myHp: number;
  myStatus: UserStatus;
}) {
  const toState = (a: RemoteUser['avatar'], bg: BgKind): AvatarState => ({
    shape: a.shape as AvatarState['shape'],
    color: a.color,
    scale: a.scale,
    action: a.action as AvatarState['action'],
    background: bg,
  });

  const items = [
    {
      key: 'self',
      label: `${selfUsername ?? '我'} (你)`,
      avatar: state,
      x: selfPos.x,
      z: selfPos.z,
      attackAt: selfAttackAt,
      hitAt: myHitAt,
      rot: selfRot,
      moving: selfMoving,
      hp: myHp,
      status: myStatus,
    },
    ...remoteUsers.map((u) => ({
      key: u.userId,
      label: u.username,
      avatar: toState(u.avatar, state.background),
      x: u.x,
      z: u.z,
      attackAt: u.attackAt,
      hitAt: u.hitAt,
      rot: u.rot,
      moving: u.moving,
      hp: u.hp,
      status: u.status,
    })),
  ];

  return (
    <Canvas shadows camera={{ position: [0, 5, 9], fov: 50 }}>
      <color attach="background" args={[BG[state.background]]} />
      <ambientLight intensity={state.background === 'day' ? 0.8 : 0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
      {state.background === 'space' && (
        <Stars radius={50} depth={20} count={1500} factor={3} fade speed={1} />
      )}

      {/* 固定布景：人物移动时从身边掠过，强化“世界在动”的 3D 感 */}
      {DECOR.map((d, i) => (
        <DecorMesh key={i} d={d} />
      ))}

      {/* 角色与远端玩家 */}
      {items.map((it) => (
        <group key={it.key}>
          <Avatar
            state={it.avatar}
            position={[it.x, 0, it.z]}
            label={it.label}
            attackAt={it.attackAt}
            hitAt={it.hitAt}
            rot={it.rot}
            moving={it.moving}
          />
          {/* 头顶浮动血条（死亡时显示 💀，被减速时显示状态图标） */}
          <Html position={[it.x, 2.7, it.z]} center className="pointer-events-none select-none" zIndexRange={[20, 0]}>
            <div className="w-16 -translate-y-1 text-center">
              {it.hp <= 0 ? (
                <div className="text-lg leading-none">💀</div>
              ) : (
                <>
                  {it.status && it.status.until > Date.now() && (
                    <div className="mb-0.5 text-sm leading-none">
                      {it.status.skill === 'freeze' ? '❄️' : it.status.skill === 'whirlwind' ? '🌀' : '🐌'}
                    </div>
                  )}
                  <div className="mx-auto h-1.5 w-14 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, (it.hp / MAX_HP) * 100))}%`,
                        background: it.hp > 50 ? '#22c55e' : it.hp > 25 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </Html>
        </group>
      ))}

      {/* 静态地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={FLOOR[state.background]} />
      </mesh>

      {/* 固定在世界坐标的网格地面：人物走动时网格线从脚下连续流过，产生“地图在动”的真实感 */}
      <gridHelper
        args={[80, 80, GRID[state.background][0], GRID[state.background][1]]}
        position={[0, -0.98, 0]}
      />

      {effects.map((e) => (
        <SkillEffect key={e.id} e={e} />
      ))}

      <FollowCam x={selfPos.x} z={selfPos.z} />
    </Canvas>
  );
}
