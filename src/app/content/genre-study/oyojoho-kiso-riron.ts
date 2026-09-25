import { GenreContent } from '../../models/genre-content.models';

export const OYOJOHO_KISO_RIRON_CONTENT: GenreContent = {
  examType: 'oyojoho',
  genreKey: 'kiso-riron',
  genreName: '基礎理論',
  category: 'テクノロジ系',
  description: '数値表現の誤差、誤り制御符号、論理演算の応用、アルゴリズムの記法と計算量など、応用情報技術者試験の基礎理論で問われる計算・応用問題の考え方を解説しています。読み終えたら下部から問題を解いて理解を確認しましょう。',
  topics: [
    {
      title: '数値の表現と誤差',
      blocks: [
        { type: 'paragraph', html: 'コンピュータは有限のビット数で数値を扱うため、演算のたびに様々な種類の誤差が生じうる。応用情報技術者試験では、誤差の「種類の名称」だけでなく、実際にどのような計算で発生するかを問われる。' },
        {
          type: 'table',
          headers: ['誤差の種類', '発生する場面'],
          rows: [
            ['桁落ち', '絶対値がほぼ等しい2つの数の減算で、上位の有効桁が互いに打ち消し合い、結果の有効桁数が大きく減る'],
            ['情報落ち', '絶対値の差が非常に大きい数どうしの加減算で、小さい方の値が表現できる桁からあふれて結果に反映されない'],
            ['丸め誤差', '表現できる桁数に収まらない下位の桁を四捨五入・切り捨てなどで処理することで生じる誤差'],
            ['打ち切り誤差', '本来は無限に続く計算(級数展開や反復計算など)を、有限回で打ち切ることによって生じる誤差'],
            ['オーバーフロー', '演算結果が表現できる数値の範囲の上限を超えてしまう現象(誤差ではなく範囲超過)'],
            ['アンダーフロー', '演算結果が0に近すぎて、表現できる数値の下限を下回ってしまう現象(誤差ではなく範囲超過)']
          ]
        },
        {
          type: 'example',
          label: '例題: 桁落ちの計算(4桁の有効数字で計算する場合)',
          html:
            '真の値を x = 7.2346, y = 7.2341 とする。有効数字4桁に丸めて記憶すると x\' = 7.235, y\' = 7.234 となる(それぞれの丸め誤差は0.0001程度でごくわずか)。<br>' +
            '真の差: x − y = 7.2346 − 7.2341 = <strong>0.0005</strong><br>' +
            '丸めた値どうしの差: x\' − y\' = 7.235 − 7.234 = <strong>0.001</strong><br>' +
            '結果の誤差は 0.001 − 0.0005 = 0.0005 であり、これは結果自体(0.0005)と同じ大きさ、つまり相対誤差にすると100%にも達する。x, y 単体では無視できた小さな丸め誤差が、近い値どうしの減算によって結果全体を支配してしまう。これが桁落ちである。'
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 170" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="10" y="18" font-size="12" fill="#333">a = 1.234×10⁵(桁の大きい数)</text>
              <rect x="10" y="26" width="150" height="30" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="85" y="46" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">1 2 3 4 0 0</text>

              <text x="10" y="80" font-size="12" fill="#333">b = 5.678×10⁻²(桁の離れた小さい数)</text>
              <rect x="10" y="88" width="150" height="30" rx="4" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="85" y="108" font-size="13" fill="#c9820a" text-anchor="middle" font-weight="bold">0 . 0 5 6 7 8</text>

              <line x1="165" y1="15" x2="165" y2="122" stroke="#d64545" stroke-width="2" stroke-dasharray="4,3"/>
              <text x="175" y="60" font-size="10.5" fill="#d64545">有効桁(4桁)の外側は</text>
              <text x="175" y="74" font-size="10.5" fill="#d64545">切り捨てられる</text>

              <rect x="10" y="132" width="150" height="30" rx="4" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="85" y="152" font-size="13" fill="#d64545" text-anchor="middle" font-weight="bold">a+b ≈ 1.234×10⁵</text>
              <text x="170" y="152" font-size="10.5" fill="#333">bの値がほぼ反映されない(情報落ち)</text>
            </svg>
          `,
          caption: '桁の大きく異なる a と b を加算すると、有効桁数(ここでは4桁)の枠に収まらない b の情報が失われ、結果は a とほぼ変わらなくなる。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '桁落ちと情報落ちは名前が似ているが原因が逆である。<strong>桁落ち</strong>は「絶対値がほぼ等しい数の減算」で有効桁が打ち消し合うこと、<strong>情報落ち</strong>は「絶対値の差が極端に大きい数の加減算」で小さい方の値が反映されないことを指す。また、オーバーフロー・アンダーフローは「誤差」ではなく表現範囲を超える現象である点も区別すること。' }
      ]
    },
    {
      title: '誤り制御符号(パリティ・CRC・ハミング符号)',
      blocks: [
        { type: 'paragraph', html: 'データ伝送や記憶の際に発生するビット誤りに対処する方式には、誤りの有無を検出するだけのものと、誤った位置を特定して訂正できるものがある。基本情報レベルではパリティビットの仕組みが中心だが、応用情報では「検出」と「訂正」の違い、および代表的な方式の使い分けが問われる。' },
        {
          type: 'table',
          headers: ['方式', '誤り検出', '誤り訂正', '特徴'],
          rows: [
            ['パリティビット', '1ビット誤りを検出', '不可', '1の個数の偶奇をそろえるビットを1つ付加する最も単純な方式'],
            ['チェックサム', 'まとまった誤り(バースト誤り)をある程度検出', '不可', 'データを一定単位で区切り、合計値(検査和)を付加して比較する'],
            ['CRC(巡回冗長検査)', 'バースト誤りを高い精度で検出', '通常は不可', '生成多項式による除算の余りを検査用データとして付加する。LANやストレージ装置で広く利用される'],
            ['ハミング符号', '1〜2ビットの誤りを検出', '1ビットの誤りを訂正', '複数の検査ビットを分散配置し、誤り位置を特定して自動的に訂正できる']
          ]
        },
        {
          type: 'example',
          label: '例題: ハミング符号(7,4)による誤り訂正の仕組み',
          html:
            '送信データを d1d2d3d4 = 1011 とし、位置1・2・4に検査ビット p1, p2, p4 を挿入して7ビットの符号語(位置1〜7 = p1, p2, d1, p4, d2, d3, d4)を作る。<br>' +
            'p1(位置1,3,5,7を担当) = d1 ⊕ d2 ⊕ d4 = 1 ⊕ 0 ⊕ 1 = 0<br>' +
            'p2(位置2,3,6,7を担当) = d1 ⊕ d3 ⊕ d4 = 1 ⊕ 1 ⊕ 1 = 1<br>' +
            'p4(位置4,5,6,7を担当) = d2 ⊕ d3 ⊕ d4 = 0 ⊕ 1 ⊕ 1 = 0<br>' +
            '送信符号語: <strong>0 1 1 0 0 1 1</strong>(位置1〜7)<br><br>' +
            '伝送中に位置5(d2)のビットが反転し、受信側は 0 1 1 0 <strong>1</strong> 1 1 を受け取ったとする。受信側は検査ビットを含めて各グループのXORを再計算する。<br>' +
            'c1 = 位置1,3,5,7 = 0⊕1⊕1⊕1 = 1(不一致)<br>' +
            'c2 = 位置2,3,6,7 = 1⊕1⊕1⊕1 = 0(一致)<br>' +
            'c4 = 位置4,5,6,7 = 0⊕1⊕1⊕1 = 1(不一致)<br>' +
            'これらを c4 c2 c1 の順に並べると 1 0 1 = 10進数で <strong>5</strong>。誤りビットの位置が5であることがちょうど特定でき、そのビットを反転させれば元のデータに訂正できる。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ハミング符号が訂正できるのは1ビット誤りまでである。2ビット同時に誤ると、誤った位置を特定できず誤訂正してしまうことがある(検出できる誤りの範囲と、訂正できる誤りの範囲は異なる)。また、パリティビット単体は「検出のみ」で「訂正はできない」点をハミング符号と混同しないこと。' }
      ]
    },
    {
      title: '論理演算の応用(ブール代数とド・モルガンの法則)',
      blocks: [
        { type: 'paragraph', html: '基本情報では論理回路の入出力を求める問題が中心だが、応用情報ではブール代数の法則を使って論理式やプログラムの条件式を「等価な、より読みやすい形」に変形する応用問題として出題される。' },
        {
          type: 'formula',
          label: 'ブール代数の主な法則',
          html:
            'ド・モルガンの法則: ¬(A ∧ B) = ¬A ∨ ¬B、¬(A ∨ B) = ¬A ∧ ¬B(否定を分配すると ∧ と ∨ が入れ替わる)<br>' +
            '分配法則: A ∧ (B ∨ C) = (A ∧ B) ∨ (A ∧ C)<br>' +
            '吸収法則: A ∨ (A ∧ B) = A、A ∧ (A ∨ B) = A'
        },
        {
          type: 'example',
          label: '例題: 条件式の簡単化(ド・モルガンの法則の応用)',
          html:
            '次の擬似コードの条件式を、否定を含まない形に書き換える。<br>' +
            '<code>if not (x &gt; 0 and y &gt; 0) then …</code><br>' +
            'A: x &gt; 0、B: y &gt; 0 とすると、元の条件は ¬(A ∧ B)。ド・モルガンの法則より ¬(A ∧ B) = ¬A ∨ ¬B。<br>' +
            '¬A は「x &gt; 0 でない」= x ≦ 0、¬B は「y &gt; 0 でない」= y ≦ 0 なので、<br>' +
            '<code>if x &lt;= 0 or y &lt;= 0 then …</code><br>' +
            'と等価な式に書き換えられる。二重否定が消えて条件の意味を読み取りやすくなる。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ド・モルガンの法則を適用するときは、否定を内側に分配すると同時に ∧(and) と ∨(or) が入れ替わることを忘れやすい。¬(A ∧ B) を ¬A ∧ ¬B としてしまう(orに変えない)誤りが典型的な誤答パターンである。' }
      ]
    },
    {
      title: 'アルゴリズムの記法と計算量',
      blocks: [
        { type: 'paragraph', html: 'アルゴリズムを正確に記述・評価するための道具として、式の表記法(逆ポーランド記法)、文法の定義法(BNF)、効率の評価法(計算量のオーダー記法)がある。応用情報ではこれらを実際に「手を動かして」評価・比較できるかが問われる。' },
        { type: 'formula', label: '逆ポーランド記法(後置記法)の評価手順', html: '① 式を先頭から読み、オペランド(数値)が出てきたらスタックにpushする。② 演算子が出てきたら、スタックから2つpopし、「先にpopした値」を右側、「後にpopした値」を左側として演算を行い、その結果を再びpushする。③ 式を最後まで読み終えたとき、スタックに残る1つの値が計算結果である。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="11" fill="#333">
                <text x="35" y="14" text-anchor="middle">読む: 3</text>
                <rect x="0" y="20" width="70" height="50" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="35" y="42" text-anchor="middle" fill="#2f5fe0" font-weight="bold">push</text>
                <text x="35" y="60" text-anchor="middle" fill="#2f5fe0" font-weight="bold">[3]</text>

                <line x1="72" y1="45" x2="88" y2="45" stroke="#7b8794" stroke-width="1.5"/>

                <text x="125" y="14" text-anchor="middle">読む: 4</text>
                <rect x="90" y="20" width="70" height="50" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="125" y="42" text-anchor="middle" fill="#2f5fe0" font-weight="bold">push</text>
                <text x="125" y="60" text-anchor="middle" fill="#2f5fe0" font-weight="bold">[3,4]</text>

                <line x1="162" y1="45" x2="178" y2="45" stroke="#7b8794" stroke-width="1.5"/>

                <text x="215" y="14" text-anchor="middle">読む: +</text>
                <rect x="180" y="20" width="70" height="50" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="215" y="40" text-anchor="middle" fill="#1f9d55" font-weight="bold">3+4=7</text>
                <text x="215" y="58" text-anchor="middle" fill="#1f9d55" font-weight="bold">[7]</text>

                <line x1="252" y1="45" x2="268" y2="45" stroke="#7b8794" stroke-width="1.5"/>

                <text x="305" y="14" text-anchor="middle">読む: 5</text>
                <rect x="270" y="20" width="70" height="50" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="305" y="42" text-anchor="middle" fill="#2f5fe0" font-weight="bold">push</text>
                <text x="305" y="60" text-anchor="middle" fill="#2f5fe0" font-weight="bold">[7,5]</text>

                <line x1="342" y1="45" x2="358" y2="45" stroke="#7b8794" stroke-width="1.5"/>

                <text x="390" y="14" text-anchor="middle">読む: *</text>
                <rect x="360" y="20" width="60" height="50" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="390" y="40" text-anchor="middle" fill="#1f9d55" font-weight="bold">7×5=35</text>
                <text x="390" y="58" text-anchor="middle" fill="#1f9d55" font-weight="bold">[35]</text>
              </g>
            </svg>
          `,
          caption: '「3 4 + 5 *」をスタックで評価する流れ。数値はpushし、演算子が来たら直近の2つをpopして計算し、結果を再びpushする。最終的にスタックに残る35が答え。'
        },
        { type: 'example', label: '例題: BNFによる文法定義と導出', html: '数字列を定義する文法を BNF で <code>&lt;数&gt; ::= &lt;数字&gt; | &lt;数&gt;&lt;数字&gt;</code>、<code>&lt;数字&gt; ::= "0" | "1" | … | "9"</code> のように定義する。「::=」は「〜と定義する」、「|」は「または」を表す。この規則から文字列 "12" を導出すると、<br>&lt;数&gt; → &lt;数&gt;&lt;数字&gt; → &lt;数字&gt;&lt;数字&gt; → "1""2" = "12"<br>のように、開始記号から規則を繰り返し適用して目的の文字列を生成できることが確認できる。' },
        {
          type: 'table',
          headers: ['オーダー', '意味', '代表的な例'],
          rows: [
            ['O(1)', 'データ量nに関係なく一定の手順で終わる', '配列の添字によるアクセス'],
            ['O(log n)', 'nが増えても処理量は緩やかにしか増えない', '二分探索'],
            ['O(n)', '処理量がnに比例して増える', '線形探索'],
            ['O(n log n)', '分割統治法などで実現される効率的な整列', 'マージソート、クイックソート(平均時)'],
            ['O(n²)', '処理量がnの2乗に比例して増え、データが増えると急激に遅くなる', '単純選択法(選択ソート)、バブルソート、単純挿入法']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '逆ポーランド記法の評価では、演算子に対して「先にpopした値」と「後にpopした値」のどちらを右オペランド・左オペランドにするかを間違えやすい。加算・乗算のように順序を入れ替えても結果が変わらない演算子では問題になりにくいが、減算・除算のように順序が結果を左右する演算子では特に注意が必要である。また、計算量オーダーはあくまで「データ量が増えたときの増加の仕方」を表す指標であり、実際の実行時間そのものを表すわけではない点も押さえておく。' }
      ]
    }
  ]
};
