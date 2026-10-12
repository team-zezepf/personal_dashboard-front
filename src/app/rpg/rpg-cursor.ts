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

// ===== ゲーム用の手(front#252) =====
// ボタン・音量バーなど押せる部品の上で、宝石の代わりに出す。白い手袋で人差し指を立てた形。
// 宝石と同じ canvas(40×44 の座標・GEM_SCALE 倍)に描き、人差し指の先がクリック位置
export const HAND_TIP: [number, number] = [16 * GEM_SCALE, 3 * GEM_SCALE];

const OUTLINE = '#2a2342';

export class HandCursor {
  constructor(private canvas: HTMLCanvasElement) {}

  draw(time: number, dpr: number): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const k = dpr * GEM_SCALE;
    const width = Math.round(GEM_W * k);
    if (this.canvas.width !== width) {
      this.canvas.width = width;
      this.canvas.height = Math.round(GEM_H * k);
    }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, GEM_W, GEM_H);
    // 押すように、少しだけ上下に動く
    ctx.translate(0, (1 - Math.cos(time * 6)) * 0.7);

    // 手袋の形(人差し指・にぎった手・折った指の関節・親指)
    const shapes: ((c: CanvasRenderingContext2D) => void)[] = [
      (c) => c.roundRect(12, 3, 8, 20, 4),
      (c) => c.roundRect(9, 16, 22, 17, 7),
      (c) => c.arc(22.5, 18, 3.6, 0, Math.PI * 2),
      (c) => c.arc(27, 19.5, 3.3, 0, Math.PI * 2),
      (c) => c.ellipse(10, 24, 3.6, 5.6, -0.5, 0, Math.PI * 2)
    ];
    const pathOf = (shape: (c: CanvasRenderingContext2D) => void) => {
      ctx.beginPath();
      shape(ctx);
    };
    // 太いふちを先に描き、その上を塗ると、形どうしの境目に線が出ず、外側だけがふちになる
    ctx.lineWidth = 3.6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    for (const s of shapes) {
      pathOf(s);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.roundRect(11, 32, 18, 6, 2);
    ctx.stroke();
    const glove = ctx.createLinearGradient(8, 0, 32, 0);
    glove.addColorStop(0, '#ffffff');
    glove.addColorStop(0.55, '#f4f6fb');
    glove.addColorStop(1, '#cfd8e8');
    ctx.fillStyle = glove;
    for (const s of shapes) {
      pathOf(s);
      ctx.fill();
    }
    // 折った指のすじ
    ctx.strokeStyle = '#9aa6bd';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    for (const x of [20.2, 25]) {
      ctx.beginPath();
      ctx.moveTo(x, 21);
      ctx.lineTo(x, 24.5);
      ctx.stroke();
    }
    // 手首の金色の飾り
    ctx.fillStyle = '#f5b942';
    ctx.beginPath();
    ctx.roundRect(11, 32, 18, 6, 2);
    ctx.fill();
    ctx.fillStyle = '#d9912a';
    ctx.fillRect(11.5, 35.5, 17, 1.4);
    // 指先のきらり
    ctx.fillStyle = `rgba(255,255,255,${0.55 + Math.sin(time * 4) * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(14.6, 7.5, 1.1, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 右上に小さな星がまたたく
    const a = 0.35 + Math.max(0, Math.sin(time * 3)) * 0.65;
    ctx.fillStyle = `rgba(253, 224, 71, ${a})`;
    ctx.beginPath();
    const [sx, sy, r] = [31, 7, 3.2];
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * 0.35 : r;
      const t = (i * Math.PI) / 4;
      ctx[i ? 'lineTo' : 'moveTo'](sx + Math.cos(t) * rr, sy + Math.sin(t) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
}
