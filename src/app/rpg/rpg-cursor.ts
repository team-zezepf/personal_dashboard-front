// RPG画面のマウスカーソル「回る宝石」(逆さまの四角すい)。CSSのカーソルはアニメーションできないため、
// ゲーム画面の上ではOSのカーソルを隠し、小さな canvas をマウスの位置に重ねて毎フレーム描く

export type GemState = 'normal' | 'talk' | 'attack';

// 描画は 40×44 の座標で行い、GEM_SCALE 倍に縮めて表示する(レビューで3/4の大きさに決めた)
const GEM_W = 40;
const GEM_H = 44;
export const GEM_SCALE = 0.75;
// 先端(いちばん下の点)がクリック位置
export const GEM_TIP: [number, number] = [20 * GEM_SCALE, 41 * GEM_SCALE];
export const GEM_SIZE: [number, number] = [GEM_W * GEM_SCALE, GEM_H * GEM_SCALE];

// ふつう＝青 / 人を指している＝金色 / 敵を指している＝赤
const HUE: Record<GemState, number> = { normal: 222, talk: 42, attack: 352 };
// 1秒あたりの回転(ラジアン)。敵を指しているときは速く回る
const SPEED: Record<GemState, number> = { normal: 2.2, talk: 2.2, attack: 5 };

export class GemCursor {
  private angle = 0;

  constructor(private canvas: HTMLCanvasElement) {}

  draw(state: GemState, dt: number, time: number, dpr: number): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    this.angle += dt * SPEED[state];
    const k = dpr * GEM_SCALE;
    const width = Math.round(GEM_W * k);
    if (this.canvas.width !== width) {
      this.canvas.width = width;
      this.canvas.height = Math.round(GEM_H * k);
    }
    const h = HUE[state];
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, GEM_W, GEM_H);

    const tx = 20;
    const ty = 41;
    const cy = 13;
    const r = 15;
    const tilt = 0.3;
    const corners: [number, number][] = [0, 1, 2, 3].map((i) => {
      const a = this.angle + (i * Math.PI) / 2;
      return [tx + Math.cos(a) * r, cy + Math.sin(a) * r * tilt];
    });

    // 後ろの光
    const glow = ctx.createRadialGradient(tx, cy + 8, 2, tx, cy + 8, 20);
    glow.addColorStop(0, `hsla(${h}, 90%, 75%, 0.45)`);
    glow.addColorStop(1, `hsla(${h}, 90%, 75%, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, GEM_W, GEM_H);

    const fillPoly = (pts: [number, number][], color: string) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.8;
      ctx.lineJoin = 'round';
      ctx.stroke();
    };
    // 側面4枚。向きで明るさを変え、奥の面 → 上の面 → 手前の面の順に描く
    const faces = [0, 1, 2, 3].map((i) => {
      const m = this.angle + (i * Math.PI) / 2 + Math.PI / 4;
      return {
        pts: [[tx, ty], corners[i], corners[(i + 1) % 4]] as [number, number][],
        front: Math.sin(m) > 0,
        light: 0.5 + 0.5 * Math.cos(m - Math.PI * 0.8)
      };
    });
    for (const f of faces.filter((f) => !f.front)) fillPoly(f.pts, `hsl(${h}, 60%, ${38 + f.light * 20}%)`);
    fillPoly(corners, `hsl(${h}, 75%, 82%)`);
    for (const f of faces.filter((f) => f.front)) fillPoly(f.pts, `hsl(${h}, 62%, ${45 + f.light * 28}%)`);
    // きらり
    ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(time * 4) * 0.4})`;
    ctx.beginPath();
    ctx.arc(tx - 5, cy - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
