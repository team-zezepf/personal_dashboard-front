import { GenreContent } from '../../models/genre-content.models';

// 実際の論理回路記号(JIS/MIL記号)に近い形でゲートを描画するヘルパー群。
// 入力線(左)・ゲート本体(中央)・出力線(右)の3要素で構成し、色は呼び出し側から渡す。
const inputLines = (twoInputs: boolean) =>
  twoInputs
    ? '<line x1="0" y1="18" x2="20" y2="18" stroke="#7b8794" stroke-width="2"/><line x1="0" y1="42" x2="20" y2="42" stroke="#7b8794" stroke-width="2"/>'
    : '<line x1="0" y1="30" x2="20" y2="30" stroke="#7b8794" stroke-width="2"/>';

const AND_GATE_SVG = (fill: string, stroke: string) => `
  <svg viewBox="0 0 120 60" width="100%" height="60" xmlns="http://www.w3.org/2000/svg">
    ${inputLines(true)}
    <path d="M20,8 L45,8 A22,22 0 0 1 45,52 L20,52 Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
    <line x1="67" y1="30" x2="110" y2="30" stroke="#7b8794" stroke-width="2"/>
  </svg>
`;

const OR_GATE_SVG = (fill: string, stroke: string) => `
  <svg viewBox="0 0 120 60" width="100%" height="60" xmlns="http://www.w3.org/2000/svg">
    ${inputLines(true)}
    <path d="M20,8 C40,8 55,10 72,30 C55,50 40,52 20,52 C32,42 32,18 20,8 Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
    <line x1="72" y1="30" x2="110" y2="30" stroke="#7b8794" stroke-width="2"/>
  </svg>
`;

const NOT_GATE_SVG = (fill: string, stroke: string) => `
  <svg viewBox="0 0 120 60" width="100%" height="60" xmlns="http://www.w3.org/2000/svg">
    ${inputLines(false)}
    <path d="M20,8 L20,52 L62,30 Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
    <circle cx="68" cy="30" r="6" fill="white" stroke="${stroke}" stroke-width="2.5"/>
    <line x1="74" y1="30" x2="110" y2="30" stroke="#7b8794" stroke-width="2"/>
  </svg>
`;

const XOR_GATE_SVG = (fill: string, stroke: string) => `
  <svg viewBox="0 0 120 60" width="100%" height="60" xmlns="http://www.w3.org/2000/svg">
    ${inputLines(true)}
    <path d="M12,8 C24,18 24,42 12,52" fill="none" stroke="${stroke}" stroke-width="2.5"/>
    <path d="M20,8 C40,8 55,10 72,30 C55,50 40,52 20,52 C32,42 32,18 20,8 Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
    <line x1="72" y1="30" x2="110" y2="30" stroke="#7b8794" stroke-width="2"/>
  </svg>
`;

const NAND_GATE_SVG = (fill: string, stroke: string) => `
  <svg viewBox="0 0 120 60" width="100%" height="60" xmlns="http://www.w3.org/2000/svg">
    ${inputLines(true)}
    <path d="M20,8 L45,8 A22,22 0 0 1 45,52 L20,52 Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
    <circle cx="73" cy="30" r="6" fill="white" stroke="${stroke}" stroke-width="2.5"/>
    <line x1="79" y1="30" x2="110" y2="30" stroke="#7b8794" stroke-width="2"/>
  </svg>
`;

const NOR_GATE_SVG = (fill: string, stroke: string) => `
  <svg viewBox="0 0 120 60" width="100%" height="60" xmlns="http://www.w3.org/2000/svg">
    ${inputLines(true)}
    <path d="M20,8 C40,8 55,10 72,30 C55,50 40,52 20,52 C32,42 32,18 20,8 Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
    <circle cx="78" cy="30" r="6" fill="white" stroke="${stroke}" stroke-width="2.5"/>
    <line x1="84" y1="30" x2="110" y2="30" stroke="#7b8794" stroke-width="2"/>
  </svg>
`;

export const KIHONJOHO_KISO_RIRON_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'kiso-riron',
  genreName: '基礎理論',
  category: 'テクノロジ系',
  description: '2進数・論理演算・数値表現など、基礎理論で問われる要点を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '基数変換(2進数・8進数・16進数)',
      relatedExamples: '関連する出題例: 「2進数の1101を10進数に変換」「16進数のA3を10進数に変換」など',
      blocks: [
        { type: 'paragraph', html: 'コンピュータは内部で2進数(0と1)を使ってデータを扱う。桁数が多く読みにくいため、人が扱う際は8進数や16進数で短く表記することが多い。' },
        {
          type: 'table',
          headers: ['10進数', '2進数', '8進数', '16進数'],
          rows: [
            ['0', '0000', '0', '0'],
            ['7', '0111', '7', '7'],
            ['10', '1010', '12', 'A'],
            ['15', '1111', '17', 'F']
          ]
        },
        { type: 'example', label: '例題: 2進数 1101 → 10進数', html: '1101(2) = 1×2³ + 1×2² + 0×2¹ + 1×2⁰ = 8 + 4 + 0 + 1 = <strong>13</strong>' },
        { type: 'example', label: '例題: 16進数 2F → 10進数', html: '2F(16) = 2×16¹ + 15×16⁰ = 32 + 15 = <strong>47</strong>(A〜Fはそれぞれ10〜15を表す)' },
        { type: 'paragraph', html: '逆に10進数をn進数に変換するには「基数で割り続け、余りを下から順に並べる」除算法を使う。商が0になるまで基数で割り、出てきた余りを最後から先頭へ向かって並べると変換後の数値になる。' },
        { type: 'example', label: '例題: 10進数 26 → 2進数', html: '26 ÷ 2 = 13 余り 0<br>13 ÷ 2 = 6 余り 1<br>6 ÷ 2 = 3 余り 0<br>3 ÷ 2 = 1 余り 1<br>1 ÷ 2 = 0 余り 1<br>余りを下から上に読むと 26(10) = <strong>11010(2)</strong>' },
        { type: 'example', label: '例題: 10進数 200 → 16進数', html: '200 ÷ 16 = 12 余り 8<br>12 ÷ 16 = 0 余り 12(C)<br>余りを下から上に読むと 200(10) = <strong>C8(16)</strong>(余り12はCと表記)' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '8進数・16進数はどちらも「各桁の重み(8のn乗、16のn乗)×桁の値」を足し合わせるだけで10進数に変換できる。基数(2, 8, 16)が違うだけで考え方は同じ。逆方向(10進数→n進数)は割り算の「余り」を使う点が、10進数への変換(掛け算で重みを足す)と逆になることを意識するとよい。' }
      ]
    },
    {
      title: '論理演算と論理回路',
      relatedExamples: '関連する出題例: 「論理回路の出力を求める」「ド・モルガンの法則」「XORの結果」など',
      blocks: [
        { type: 'paragraph', html: '論理演算は0/1(偽/真)を扱う演算で、論理回路図は演算の組み合わせを図で表したもの。まずは基本の6種類の入出力を覚える。' },
        {
          type: 'table',
          headers: ['A', 'B', 'AND', 'OR', 'XOR', 'NAND', 'NOR'],
          rows: [
            ['0', '0', '0', '0', '0', '1', '1'],
            ['0', '1', '0', '1', '1', '1', '0'],
            ['1', '0', '0', '1', '1', '1', '0'],
            ['1', '1', '1', '1', '0', '0', '0']
          ]
        },
        { type: 'paragraph', html: '論理回路図では、ゲートの形そのものが種類を表す。AND/NANDは左辺が直線+右側が半円、OR/NOR/XORは背面がへこみ先端がとがった形、NOTは三角形。NAND・NOR・NOTの出力側についている小さな丸は「反転(否定)」を表す。' },
        {
          type: 'iconGrid',
          items: [
            { svg: AND_GATE_SVG('#eef2ff', '#2f5fe0'), label: 'AND', desc: '両方1のとき1' },
            { svg: OR_GATE_SVG('#eafaf0', '#1f9d55'), label: 'OR', desc: 'どちらかが1で1' },
            { svg: NOT_GATE_SVG('#fdeaea', '#d64545'), label: 'NOT', desc: '入力を反転(丸は反転を表す)' },
            { svg: XOR_GATE_SVG('#fff4e5', '#c9820a'), label: 'XOR', desc: '異なるとき1(ORに入力側の二重線)' },
            { svg: NAND_GATE_SVG('#f3e8ff', '#7c3aed'), label: 'NAND', desc: 'ANDの反転(出力に丸)' },
            { svg: NOR_GATE_SVG('#e6f7fa', '#0f8fa8'), label: 'NOR', desc: 'ORの反転(出力に丸)' }
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 160" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <line x1="10" y1="50" x2="100" y2="50" stroke="#333" stroke-width="2"/>
              <text x="4" y="45" font-size="13" fill="#333">A=0</text>
              <line x1="10" y1="110" x2="100" y2="110" stroke="#333" stroke-width="2"/>
              <text x="4" y="128" font-size="13" fill="#333">B=1</text>
              <path d="M100,38 C130,38 150,42 172,80 C150,118 130,122 100,122 C114,108 114,52 100,38 Z" fill="#eafaf0" stroke="#1f9d55" stroke-width="2.5"/>
              <line x1="172" y1="80" x2="230" y2="80" stroke="#333" stroke-width="2"/>
              <path d="M230,60 L230,100 L266,80 Z" fill="#fdeaea" stroke="#d64545" stroke-width="2.5"/>
              <circle cx="272" cy="80" r="6" fill="white" stroke="#d64545" stroke-width="2.5"/>
              <line x1="278" y1="80" x2="360" y2="80" stroke="#333" stroke-width="2"/>
              <text x="330" y="68" font-size="13" fill="#333">Z=?</text>
            </svg>
          `,
          caption: '例: A=0, B=1をORに入れて1、その出力をNOTに通すと0。よって Z=0。(NOT出力の丸は反転を表す)'
        },
        { type: 'formula', label: 'ド・モルガンの法則', html: '¬(A ∧ B) = ¬A ∨ ¬B　(「AかつBでない」は「Aでない、またはBでない」)<br>¬(A ∨ B) = ¬A ∧ ¬B　(「AまたはBでない」は「Aでない、かつBでない」)' }
      ]
    },
    {
      title: '数値の表現方法',
      relatedExamples: '関連する出題例: 「浮動小数点数の指数部とは」「2の補数の求め方」など',
      blocks: [
        { type: 'paragraph', html: 'コンピュータが数値を2進数で表現する方式には、小数点の位置を固定する方式と、指数を使って可変にする方式がある。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 70" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="0" y="10" width="50" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/>
              <text x="25" y="34" font-size="11" fill="#2f5fe0" text-anchor="middle">符号部</text>
              <rect x="50" y="10" width="140" height="40" fill="#eafaf0" stroke="#1f9d55" stroke-width="1.5"/>
              <text x="120" y="34" font-size="11" fill="#1f9d55" text-anchor="middle">指数部</text>
              <rect x="190" y="10" width="200" height="40" fill="#fff4e5" stroke="#c9820a" stroke-width="1.5"/>
              <text x="290" y="34" font-size="11" fill="#c9820a" text-anchor="middle">仮数部</text>
            </svg>
          `,
          caption: '浮動小数点数のビット構成: 符号部・指数部(小数点の位置)・仮数部(有効数字)'
        },
        { type: 'example', label: '例題: 2の補数(負の数の表現)の求め方', html: '各ビットを反転(0→1, 1→0)し、最後に1を加える。<br>例: 5 = 00000101 → 反転 11111010 → +1 → 11111011(これが -5 を表す)' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「1の補数」は反転するだけ、「2の補数」はさらに+1する。混同しやすいので注意。固定小数点数は精度・範囲が固定、浮動小数点数は指数部により広い範囲を表現できる。' }
      ]
    },
    {
      title: '誤り検出(パリティビット)',
      relatedExamples: '関連する出題例: 「1の個数の偶奇を調整するビットは何か」',
      blocks: [
        { type: 'paragraph', html: 'データ伝送中の誤りを検出するため、データに1ビット付加して1の個数を偶数(偶数パリティ)または奇数(奇数パリティ)にそろえる。受信側で1の個数を数え、想定と異なれば誤りと判断できる。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 360 70" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="13" fill="#333" text-anchor="middle">
                <rect x="0" y="15" width="40" height="30" fill="#f7f9fb" stroke="#c7cdd6"/><text x="20" y="35">1</text>
                <rect x="40" y="15" width="40" height="30" fill="#f7f9fb" stroke="#c7cdd6"/><text x="60" y="35">0</text>
                <rect x="80" y="15" width="40" height="30" fill="#f7f9fb" stroke="#c7cdd6"/><text x="100" y="35">1</text>
                <rect x="120" y="15" width="40" height="30" fill="#f7f9fb" stroke="#c7cdd6"/><text x="140" y="35">1</text>
                <rect x="160" y="15" width="40" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="180" y="35" fill="#2f5fe0">1</text>
              </g>
              <text x="270" y="35" font-size="12" fill="#7b8794">← パリティビット(1が偶数個になるよう付加)</text>
            </svg>
          `,
          caption: 'データ「1011」は1が3個(奇数)なので、偶数パリティにするため「1」を付加して1の個数を4個(偶数)にそろえる。'
        }
      ]
    },
    {
      title: '文字コード',
      relatedExamples: '関連する出題例: 「世界中の文字を統一的に扱う文字コード体系はどれか」',
      blocks: [
        {
          type: 'table',
          headers: ['コード', '特徴'],
          rows: [
            ['ASCII', '英数字・記号を7ビットで表現する最も基本的な文字コード'],
            ['JISコード', '日本語(ひらがな・カタカナ・漢字)を扱うために策定'],
            ['Unicode', '世界中の文字を統一的な体系で扱うために策定(現在主流)'],
            ['EBCDIC', '主にIBM系大型機で使われてきた文字コード']
          ]
        }
      ]
    }
  ]
};
