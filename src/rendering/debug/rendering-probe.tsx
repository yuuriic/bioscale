/**
 * Objeto técnico temporário que comprova o pipeline Next → React → R3F →
 * Three → WebGL. Não representa nenhuma entidade biológica e não conhece o
 * Experience Engine; será removido quando existirem cenas reais.
 */
export function RenderingProbe() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} />
      <mesh rotation={[0.4, 0.6, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4f9d8a" />
      </mesh>
    </>
  );
}
