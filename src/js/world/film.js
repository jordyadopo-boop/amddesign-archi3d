/**
 * Passe « argentique » : étalonnage chaud (noirs relevés, hautes lumières crème), grain de pellicule,
 * légère aberration chromatique sur les bords, vignettage. Grain fixe : rien ne clignote.
 */
export const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uGrain: { value: 0.06 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uGrain;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float d = dot(c, c);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + c * d * 0.018).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - c * d * 0.018).b;
      col = clamp(col, 0.0, 1.0);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, 0.72);                                  // couleurs passées, tirage argentique
      col *= mix(vec3(0.94, 1.0, 0.98), vec3(1.07, 1.0, 0.88), l);     // ombres froides, lumières chaudes
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.35);              // courbe en S douce
      col = col * 0.94 + vec3(0.035, 0.028, 0.018);                     // noirs relevés, chauds
      float g = rand(floor(vUv * vec2(1400.0, 900.0))) - 0.5;
      col += g * uGrain * (1.15 - l);
      col *= 1.0 - d * 0.85;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
