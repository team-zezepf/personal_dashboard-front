/*
 * Android版アプリのアイコンを、元画像(assets/icon.png)から書き出す(front#188)。npm run android:icons で実行する。
 * アイコンを変えたいときは assets/icon.png を差し替えて実行し、npm run android:apk で APK を作り直す。
 *
 * 元画像は「透明な背景に丸い絵」を想定している。不透明な部分の外接矩形から丸の中心と半径を測り、
 * - アダプティブアイコン(Android 8 以降)の前景: 108dp のキャンバスのうち、端末が切り抜いて見せる中央 72dp の丸が
 *   絵で埋まるよう、丸の半径を 36dp よりわずかに大きくして置く。背景は透明(values/ic_launcher_background.xml)
 * - Android 7 以前のアイコン(48dp。切り抜かれない): 絵全体が収まるよう、少し余白を付けて置く
 *
 * 書き出し先: android/app/src/main/res/mipmap-<密度>/ic_launcher_foreground.png・ic_launcher.png・ic_launcher_round.png
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'assets/icon.png');
const resDir = resolve(root, 'android/app/src/main/res');

// 密度ごとの 1dp のピクセル数
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
// 丸を 72dp の切り抜きより少しだけ大きくし、切り抜きの縁に透明な隙間が出ないようにする
const BLEED = 1.03;

// 不透明度がしきい値以上のピクセルの外接矩形
async function opaqueBounds(threshold) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] >= threshold) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) throw new Error(`${source} に不透明な部分がありません`);
  return { minX, minY, maxX, maxY };
}

// 元画像を scale 倍にし、元画像の (cx, cy) がキャンバスの中心に来るように置いた size×size の画像
async function placeCentered(size, scale, cx, cy) {
  const meta = await sharp(source).metadata();
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const left = Math.round(size / 2 - cx * scale);
  const top = Math.round(size / 2 - cy * scale);
  // キャンバスからはみ出す部分は先に切り取る(composite ははみ出しを扱えないため)
  const crop = {
    left: Math.max(0, -left),
    top: Math.max(0, -top),
    width: Math.min(w, size - left) - Math.max(0, -left),
    height: Math.min(h, size - top) - Math.max(0, -top)
  };
  const piece = await sharp(source).resize(w, h).extract(crop).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }])
    .png();
}

// 丸の中心と半径は、ほぼ不透明な部分で測る(外側のぼんやりした光は含めない)
const solid = await opaqueBounds(250);
const cx = (solid.minX + solid.maxX) / 2;
const cy = (solid.minY + solid.maxY) / 2;
const radius = Math.min(solid.maxX - solid.minX, solid.maxY - solid.minY) / 2;
// 小さいアイコンでは、外側の光まで含めた全体が収まるようにする
const whole = await opaqueBounds(10);
const wholeRadius = Math.max(cx - whole.minX, whole.maxX - cx, cy - whole.minY, whole.maxY - cy);

for (const [density, px] of Object.entries(DENSITIES)) {
  const dir = resolve(resDir, `mipmap-${density}`);
  const foregroundSize = Math.round(108 * px);
  await (await placeCentered(foregroundSize, (36 * px * BLEED) / radius, cx, cy)).toFile(resolve(dir, 'ic_launcher_foreground.png'));
  const legacySize = Math.round(48 * px);
  const legacy = await placeCentered(legacySize, (legacySize / 2 - 1 * px) / wholeRadius, cx, cy);
  await legacy.clone().toFile(resolve(dir, 'ic_launcher.png'));
  await legacy.clone().toFile(resolve(dir, 'ic_launcher_round.png'));
  console.log(`mipmap-${density}: 前景 ${foregroundSize}px・アイコン ${legacySize}px`);
}
console.log('アイコンを書き出しました。npm run android:apk で APK を作り直してください');
