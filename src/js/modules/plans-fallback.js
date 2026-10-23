/** Repli sans WebGL : la villa en plan 2D / volume filaire, qui tourne lentement (canvas 2D). */
import { PlanView, HALF_PI, lerp } from '../plan/view.js';
import { villa } from '../plan/models.js';

export default function init(canvas) {
  const view = new PlanView(canvas, { gold: '#c8902e', grey: '#8f8f8f', ink: '#8f8f8f' });
  const m = villa();
  let yaw = -0.8, draw = 0, last = 0;
  addEventListener('resize', () => view.resize());
  const frame = (now) => {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    yaw += dt * 0.05; draw = Math.min(1, draw + dt * 0.5);
    const ext = 0.5 + 0.5 * Math.sin(scrollY / 900);
    view.render(m, { draw, ext, pitch: lerp(HALF_PI, 0.6, ext), yaw, zoom: 0.8, alpha: 0.6, grid: 1,
      px: view.w * (view.w > 900 ? 0.68 : 0.5), py: view.h * 0.55 });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
