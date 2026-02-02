import React, { Suspense, useRef, useEffect } from 'react';
import { ElementType, GenMon } from '../types';
import { getExpToNextLevel } from '../services/exp';
import { canEvolve, getNextEvolutionLevel } from '../services/evolution';
import { Heart, Zap, Shield, Swords, Wind, Sparkles, Hexagon } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Html, Float } from '@react-three/drei';
import * as THREE from 'three';

interface MonsterCardProps {
  monster: GenMon;
  showStats?: boolean;
  isPlayer?: boolean;
  className?: string;
  compact?: boolean;
  /** 战斗场景：生命值显示在精灵上方 */
  hpAboveSprite?: boolean;
}

const ElementColors: Record<ElementType, string> = {
  [ElementType.Fire]: 'bg-red-500',
  [ElementType.Water]: 'bg-blue-500',
  [ElementType.Grass]: 'bg-green-500',
  [ElementType.Electric]: 'bg-yellow-400',
  [ElementType.Rock]: 'bg-stone-500',
  [ElementType.Psychic]: 'bg-purple-500',
  [ElementType.Normal]: 'bg-gray-400',
  [ElementType.Dark]: 'bg-slate-800 text-white',
  [ElementType.Fighting]: 'bg-orange-700',
  [ElementType.Bug]: 'bg-lime-600',
};

// 3D Placeholder Component
const PlaceholderToken = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <group>
        <Float speed={5} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh ref={meshRef}>
                <octahedronGeometry args={[1.2, 0]} />
                <meshStandardMaterial color="#4b5563" wireframe transparent opacity={0.5} />
            </mesh>
             {/* Core */}
            <mesh>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={2} />
            </mesh>
        </Float>
        
        {/* Shadow */}
        <mesh position={[0, -1.8, 0]} rotation={[-Math.PI/2, 0, 0]}>
             <circleGeometry args={[1, 32]} />
             <meshBasicMaterial color="black" transparent opacity={0.3} />
        </mesh>
    </group>
  );
};

// Fragment shader: discard near-white pixels so white background becomes transparent
const uWhiteThreshold = { value: 0.92 };

const whiteDiscardFragment = `
  uniform sampler2D uMap;
  uniform float uWhiteThreshold;
  varying vec2 vUv;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float l = (tex.r + tex.g + tex.b) / 3.0;
    if (l >= uWhiteThreshold && tex.a > 0.0) discard;
    gl_FragColor = tex;
  }
`;

const whiteDiscardVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A component that renders the monster as a 2D Pixel Art Sprite in 3D space
const MonsterPixelSprite = ({ imageUrl }: { imageUrl: string }) => {
  const texture = useTexture(imageUrl);
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = React.useMemo(() => ({ uMap: { value: texture }, uWhiteThreshold }), [texture]);

  useEffect(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <group>
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
            <mesh ref={meshRef}>
                <planeGeometry args={[3, 3]} />
                <shaderMaterial
                  transparent
                  depthWrite={false}
                  side={THREE.DoubleSide}
                  uniforms={uniforms}
                  vertexShader={whiteDiscardVertex}
                  fragmentShader={whiteDiscardFragment}
                />
            </mesh>
        </Float>
        
        <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.2, 32]} />
            <meshBasicMaterial color="black" opacity={0.3} transparent />
        </mesh>
    </group>
  );
};

const MonsterCard: React.FC<MonsterCardProps> = ({ monster, showStats = true, isPlayer = false, className = "", compact = false, hpAboveSprite = false }) => {
  const hpPercent = (monster.stats.currentHp / monster.stats.maxHp) * 100;

  const hpBlock = (
    <>
      <div className={`w-full bg-gray-700 rounded-full overflow-hidden border border-gray-600 ${compact ? 'h-2 mb-0.5' : 'h-4 mb-1'}`}>
        <div 
          className={`h-full transition-all duration-500 ${hpPercent < 20 ? 'bg-red-500' : hpPercent < 50 ? 'bg-yellow-500' : 'bg-green-500'}`} 
          style={{ width: `${hpPercent}%` }}
        />
      </div>
      <div className={`text-right text-gray-300 font-mono ${compact ? 'text-[9px] leading-tight' : 'text-xs mb-4'}`}>
        {monster.stats.currentHp}/{monster.stats.maxHp} HP
      </div>
    </>
  );

  const nameLevelBlock = (
    <div className={`flex justify-between items-end ${compact ? 'mb-0.5 gap-1' : 'mb-2'}`}>
      <h3 className={`font-bold pixel-font truncate ${compact ? 'text-xs' : 'text-lg md:text-xl'}`}>{monster.name}</h3>
      <span className={`text-gray-400 flex-shrink-0 ${compact ? 'text-[10px]' : 'text-sm'}`}>Lv {monster.level}</span>
    </div>
  );

  const spriteBlock = (
    <div className={`rounded-lg relative shadow-inner bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-700 to-gray-900 border border-gray-700 overflow-hidden ${compact ? 'w-18 h-18 mb-1.5' : 'w-full aspect-square md:w-48 md:h-48 mb-4 border-2'}`}>
      {monster.imageUrl ? (
        <Canvas shadows camera={{ position: [0, 0, 6], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          <Suspense fallback={<PlaceholderToken />}>
            <MonsterPixelSprite imageUrl={monster.imageUrl} />
          </Suspense>
          <OrbitControls enableZoom={false} enableRotate={false} autoRotate={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
        </Canvas>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          {compact ? (
            <div className="w-6 h-6 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin" />
          ) : (
            <div className="flex flex-col items-center justify-center opacity-50">
              <div className="w-12 h-12 border-4 border-gray-600 border-t-emerald-500 rounded-full animate-spin mb-2"></div>
              <span className="text-xs pixel-font text-gray-400">生成中...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-gray-800 border-2 ${isPlayer ? 'border-emerald-500' : 'border-rose-500'} rounded-lg shadow-xl flex flex-col items-center relative overflow-hidden ${compact ? 'p-2' : 'p-4'} ${className}`}>
      {/* Element Badge */}
      <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase ${ElementColors[monster.element]} shadow-sm z-10`}>
        {monster.element}
      </div>

      {compact && hpAboveSprite ? (
        <>
          {/* 战斗场景：生命值在精灵上方 */}
          <div className="w-full relative z-10 min-w-0 mb-1">
            {nameLevelBlock}
            {hpBlock}
          </div>
          {spriteBlock}
        </>
      ) : (
        <>
          {spriteBlock}
          <div className={`w-full relative z-10 ${compact ? 'min-w-0' : ''}`}>
            {nameLevelBlock}
            {hpBlock}

        {/* 经验条：非紧凑且显示属性时 */}
        {showStats && !compact && (() => {
          const expNeed = getExpToNextLevel(monster.level);
          const expPct = expNeed <= 0 ? 100 : Math.min(100, (monster.exp / expNeed) * 100);
          return (
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">EXP</div>
              <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${expPct}%` }} />
              </div>
              <div className="text-right text-[10px] text-amber-200/80 font-mono">{monster.exp}/{expNeed}</div>
            </div>
          );
        })()}

        {/* Detailed Stats */}
        {showStats && !compact && (
          <>
            <div className="grid grid-cols-3 gap-2 text-xs bg-gray-900/50 p-2 rounded mb-2">
              <div className="flex flex-col items-center gap-1 text-red-300">
                <div className="flex items-center gap-1"><Swords size={12} /> 攻</div>
                <span>{monster.stats.attack}</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-blue-300">
                <div className="flex items-center gap-1"><Shield size={12} /> 防</div>
                <span>{monster.stats.defense}</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-white">
                <div className="flex items-center gap-1"><Wind size={12} /> 速</div>
                <span>{monster.stats.speed}</span>
              </div>
              
              <div className="flex flex-col items-center gap-1 text-purple-300">
                 <div className="flex items-center gap-1"><Zap size={12} /> 特攻</div>
                 <span>{monster.stats.spAttack || monster.stats.attack}</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-indigo-300">
                 <div className="flex items-center gap-1"><Hexagon size={12} /> 特防</div>
                 <span>{monster.stats.spDefense || monster.stats.defense}</span>
              </div>
            </div>
            
            {monster.evolution && (
              <div className="text-xs text-yellow-300 flex items-center gap-1 bg-gray-900/30 p-1 rounded">
                <Sparkles size={12} />
                <span>
                  {canEvolve(monster) ? `可进化: ${monster.evolution.nextStage}` : `Lv.${getNextEvolutionLevel(monster)} 可进化`}
                </span>
              </div>
            )}
          </>
        )}

        {/* Moves (Compact only shows names, full shows details) */}
        {!compact && showStats && (
             <div className="mt-4">
             <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">技能</h4>
             <div className="space-y-1">
                 {monster.moves.slice(0, 4).map((move, i) => (
                     <div key={i} className="flex justify-between text-xs bg-gray-700 px-2 py-1 rounded">
                         <span>{move.name}</span>
                         <span className={`${ElementColors[move.type]} w-2 h-2 rounded-full inline-block mt-1`}></span>
                     </div>
                 ))}
             </div>
         </div>
        )}
          </div>
        </>
      )}
    </div>
  );
};

export default MonsterCard;