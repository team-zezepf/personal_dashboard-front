import { GenreContent } from '../../models/genre-content.models';

export const KIHONJOHO_ALGORITHMS_PROGRAMMING_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'algorithms-programming',
  genreName: 'アルゴリズムとプログラミング',
  description: 'ソート・探索アルゴリズムや基本的なデータ構造(スタック・キュー・木構造など)、フローチャートの読み方など、アルゴリズムとプログラミングで問われる要点を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '流れ図(フローチャート)の読み方とトレース',
      relatedExamples: '関連する出題例: 「次のフローチャートを実行したとき、最終的に出力されるxの値として正しいものはどれか」「フローチャートにおいて、条件分岐を表すために用いられる記号の形状はどれか」など',
      blocks: [
        { type: 'paragraph', html: 'フローチャート(流れ図)はアルゴリズムの処理の流れを図形で表したものである。基本情報技術者試験では、フローチャートを読み取り、変数の値を1ステップずつ追跡(トレース)して最終結果を求める問題が頻出する。' },
        {
          type: 'table',
          headers: ['記号', '形状', '意味'],
          rows: [
            ['開始・終了', '楕円', '処理の開始点・終了点を表す'],
            ['処理', '長方形', '代入や計算などの処理を表す'],
            ['条件分岐', 'ひし形(菱形)', '条件によって処理の流れを分岐させる']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <ellipse cx="70" cy="40" rx="55" ry="26" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="70" y="45" font-size="13" fill="#2f5fe0" text-anchor="middle">開始・終了</text>

              <rect x="165" y="14" width="110" height="52" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="220" y="45" font-size="13" fill="#1f9d55" text-anchor="middle">処理</text>

              <polygon points="345,10 400,40 345,70 290,40" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="345" y="45" font-size="13" fill="#c9820a" text-anchor="middle">条件分岐</text>

              <text x="70" y="110" font-size="12" fill="#333" text-anchor="middle">楕円</text>
              <text x="220" y="110" font-size="12" fill="#333" text-anchor="middle">長方形</text>
              <text x="345" y="110" font-size="12" fill="#333" text-anchor="middle">ひし形(菱形)</text>
            </svg>
          `,
          caption: 'フローチャートで使われる基本図形。楕円は開始・終了、長方形は処理、ひし形は条件分岐を表す。'
        },
        { type: 'example', label: '例題: ループ処理のトレース(合計を求める)', html: 'x=0, i=1 から開始し、「i≦3」の間 x=x+i, i=i+1 を繰り返す。<br>i=1: x=0+1=1, i=2<br>i=2: x=1+2=3, i=3<br>i=3: x=3+3=6, i=4<br>i=4は条件を満たさずループ終了。出力される x は <strong>6</strong>。' },
        { type: 'example', label: '例題: ループ処理のトレース(階乗を求める)', html: 'x=1, i=1 から開始し、「i≦4」の間 x=x×i, i=i+1 を繰り返す(4の階乗を求める処理)。<br>i=1: x=1×1=1, i=2<br>i=2: x=1×2=2, i=3<br>i=3: x=2×3=6, i=4<br>i=4: x=6×4=24, i=5<br>i=5は条件を満たさずループ終了。出力される x は <strong>24</strong>。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ループの継続条件(「i≦3」など)を満たさなくなった時点のiの値では、ループ内の処理は実行されない。境界の値を1つ多く/少なく数えてしまうミスが起きやすいので、面倒でも1ステップずつ値を書き出してトレースするとよい。' }
      ]
    },
    {
      title: 'データ型と配列・線形リスト',
      relatedExamples: '関連する出題例: 「同じデータ型の複数の値を連続した領域にまとめて格納するデータ構造」「各データが次のデータへのポインタを持つデータ構造」「小数点を含まない整数の値を扱うために用いられるデータ型」など',
      blocks: [
        { type: 'paragraph', html: 'プログラムでは、扱うデータの種類に応じてデータ型を指定する。また、複数のデータをまとめて扱う際には配列や線形リストといったデータ構造を用いる。' },
        {
          type: 'table',
          headers: ['データ型', '扱う値'],
          rows: [
            ['整数型', '小数点を含まない整数(例: 1, -5, 100)'],
            ['実数型', '小数点を含む数値(例: 3.14)'],
            ['文字列型', '文字の並び(例: "ABC")'],
            ['論理型', '真(true)・偽(false)の2値']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 110" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="14" text-anchor="middle">
                <rect x="20" y="20" width="60" height="50" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="50" y="50" fill="#2f5fe0">10</text>
                <rect x="80" y="20" width="60" height="50" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="110" y="50" fill="#2f5fe0">20</text>
                <rect x="140" y="20" width="60" height="50" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="170" y="50" fill="#2f5fe0">30</text>
                <rect x="200" y="20" width="60" height="50" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="230" y="50" fill="#2f5fe0">40</text>
              </g>
              <g font-size="12" fill="#7b8794" text-anchor="middle">
                <text x="50" y="90">[0]</text>
                <text x="110" y="90">[1]</text>
                <text x="170" y="90">[2]</text>
                <text x="230" y="90">[3]</text>
              </g>
              <text x="330" y="50" font-size="12" fill="#333">添字で直接アクセス</text>
            </svg>
          `,
          caption: '配列: 同じ型のデータを連続した領域に格納し、添字(インデックス)で直接アクセスする。'
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 110" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <defs>
                <marker id="llArrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#333"/>
                </marker>
              </defs>
              <g font-size="13" text-anchor="middle">
                <rect x="10" y="25" width="70" height="40" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="45" y="50" fill="#1f9d55">10</text>
                <line x1="80" y1="45" x2="130" y2="45" stroke="#333" stroke-width="2" marker-end="url(#llArrow)"/>
                <rect x="130" y="25" width="70" height="40" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="165" y="50" fill="#1f9d55">20</text>
                <line x1="200" y1="45" x2="250" y2="45" stroke="#333" stroke-width="2" marker-end="url(#llArrow)"/>
                <rect x="250" y="25" width="70" height="40" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="285" y="50" fill="#1f9d55">30</text>
                <line x1="320" y1="45" x2="370" y2="45" stroke="#333" stroke-width="2" marker-end="url(#llArrow)"/>
                <text x="395" y="50" font-size="13" fill="#333" text-anchor="middle">NULL</text>
              </g>
              <text x="210" y="95" font-size="12" fill="#7b8794" text-anchor="middle">各データが次データへのポインタ(リンク)を持つ</text>
            </svg>
          `,
          caption: '線形リスト(連結リスト): 各データが次のデータへのポインタを持ち、末尾はNULLで終端する。'
        },
        {
          type: 'table',
          headers: ['観点', '配列', '線形リスト'],
          rows: [
            ['格納方法', '連続した領域に格納', '各データが次データへのポインタを持つ'],
            ['要素へのアクセス', '添字で直接アクセスできる(高速)', '先頭から順にたどる必要がある'],
            ['挿入・削除', '後続要素の移動が必要(低速)', 'ポインタの付け替えのみで済む(高速)']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '配列はランダムアクセスが得意だが挿入・削除は苦手、線形リストはその逆(アクセスは苦手だが挿入・削除は得意)という「得意・不得意が逆」の関係で対比して覚えるとよい。' }
      ]
    },
    {
      title: 'スタック・キュー・木構造',
      relatedExamples: '関連する出題例: 「後から入れたデータを先に取り出す(LIFO)というデータ構造」「先に入れたデータを先に取り出す(FIFO)というデータ構造」「各節が持つ子の数が最大2つに制限された木構造」など',
      blocks: [
        { type: 'paragraph', html: 'データの出し入れの順序に着目したデータ構造として、スタックとキューがある。また、データ同士の親子関係を表現するデータ構造として木構造がある。' },
        {
          type: 'table',
          headers: ['データ構造', '略称', '出し入れの順序', '操作名'],
          rows: [
            ['スタック', 'LIFO', '後入れ先出し(Last In First Out)', 'push(積む)/pop(取り出す)'],
            ['キュー', 'FIFO', '先入れ先出し(First In First Out)', 'enqueue(追加)/dequeue(取り出す)']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 380 220" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="14" text-anchor="middle">
                <rect x="120" y="150" width="100" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="170" y="175" fill="#2f5fe0">1(最初にpush)</text>
                <rect x="120" y="105" width="100" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="170" y="130" fill="#2f5fe0">2</text>
                <rect x="120" y="60" width="100" height="40" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="170" y="85" fill="#1f9d55">3(最後にpush)</text>
              </g>
              <line x1="240" y1="80" x2="290" y2="50" stroke="#1f9d55" stroke-width="2"/>
              <text x="295" y="48" font-size="13" fill="#1f9d55">push</text>
              <line x1="240" y1="80" x2="290" y2="90" stroke="#d64545" stroke-width="2"/>
              <text x="295" y="95" font-size="13" fill="#d64545">pop→3を取り出す</text>
              <text x="170" y="205" font-size="12" fill="#7b8794" text-anchor="middle">出入口は上部の1か所のみ(LIFO)</text>
            </svg>
          `,
          caption: 'スタック: push(1)→push(2)→push(3)の順に積むと、popで最初に取り出されるのは直前に積んだ3。'
        },
        { type: 'example', label: '例題: スタックの動作', html: 'push(1), push(2), push(3) の順に操作した直後に pop() を実行すると、取り出される値は直前にpushした <strong>3</strong>。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 120" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="13" text-anchor="middle">
                <rect x="60" y="30" width="70" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="95" y="55" fill="#2f5fe0">1(先頭)</text>
                <rect x="140" y="30" width="70" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="175" y="55" fill="#2f5fe0">2</text>
                <rect x="220" y="30" width="70" height="40" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="255" y="55" fill="#1f9d55">3(最後尾)</text>
              </g>
              <text x="30" y="45" font-size="12" fill="#d64545" text-anchor="middle">出</text>
              <line x1="58" y1="50" x2="15" y2="50" stroke="#d64545" stroke-width="2"/>
              <text x="330" y="45" font-size="12" fill="#1f9d55" text-anchor="middle">入</text>
              <line x1="292" y1="50" x2="330" y2="50" stroke="#1f9d55" stroke-width="2"/>
              <text x="175" y="100" font-size="12" fill="#7b8794" text-anchor="middle">先頭(front)から取り出し、末尾(rear)に追加する(FIFO)</text>
            </svg>
          `,
          caption: 'キュー: 最初に入れた1が最初に取り出される。行列(順番待ち)と同じ順序。'
        },
        { type: 'paragraph', html: '二分木は、各節(ノード)が持つ子の数が最大2つに制限された木構造であり、探索や整列などのアルゴリズムで広く利用される。子を持たない末端の節を「葉」と呼ぶ。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 190" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <line x1="210" y1="40" x2="120" y2="100" stroke="#333" stroke-width="2"/>
              <line x1="210" y1="40" x2="300" y2="100" stroke="#333" stroke-width="2"/>
              <line x1="120" y1="100" x2="70" y2="160" stroke="#333" stroke-width="2"/>
              <line x1="120" y1="100" x2="170" y2="160" stroke="#333" stroke-width="2"/>
              <line x1="300" y1="100" x2="300" y2="160" stroke="#333" stroke-width="2"/>
              <circle cx="210" cy="40" r="24" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="210" y="45" font-size="13" fill="#2f5fe0" text-anchor="middle">root</text>
              <circle cx="120" cy="100" r="22" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="120" y="105" font-size="12" fill="#1f9d55" text-anchor="middle">節</text>
              <circle cx="300" cy="100" r="22" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="300" y="105" font-size="12" fill="#1f9d55" text-anchor="middle">節</text>
              <circle cx="70" cy="160" r="20" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/><text x="70" y="165" font-size="11" fill="#c9820a" text-anchor="middle">葉</text>
              <circle cx="170" cy="160" r="20" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/><text x="170" y="165" font-size="11" fill="#c9820a" text-anchor="middle">葉</text>
              <circle cx="300" cy="160" r="20" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/><text x="300" y="165" font-size="11" fill="#c9820a" text-anchor="middle">葉</text>
            </svg>
          `,
          caption: '二分木: 各節の子は最大2つ(この図ではroot以下すべての節が0〜2個の子を持つ)。子を持たない節を「葉」と呼ぶ。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'スタック(LIFO)とキュー(FIFO)は取り出す順序が逆であるため混同しやすい。「積み重ねた本は上から取る(スタック)」「行列は先頭の人から進む(キュー)」のように身近な例と結びつけて覚えるとよい。' }
      ]
    },
    {
      title: '探索・整列アルゴリズムと計算量(オーダー記法)',
      relatedExamples: '関連する出題例: 「線形探索を行うときの最悪の場合の計算量を表すオーダー記法」「二分探索を行う場合の最悪時の計算量」「クイックソートの平均的な計算量」「隣り合う要素を比較し、大小関係が逆であれば交換するという操作を繰り返して整列を行うアルゴリズム」など',
      blocks: [
        { type: 'paragraph', html: 'アルゴリズムの効率、すなわちデータ量nに対して処理時間がどのように増えるかを表す指標をオーダー記法(O記法)と呼ぶ。データ量が大きくなるほど、O(1)に近いアルゴリズムほど高速である。' },
        { type: 'formula', label: 'オーダー記法(O記法)の大小関係', html: 'O(1) < O(log n) < O(n) < O(n log n) < O(n²)　(左ほどデータ量nが増えたときの計算時間の増加が緩やか=高速)' },
        {
          type: 'table',
          headers: ['探索アルゴリズム', '前提条件', '最悪計算量', '特徴'],
          rows: [
            ['線形探索', '特になし(未整列でもよい)', 'O(n)', '先頭から順に1件ずつ確認する'],
            ['二分探索', 'データが整列済みであること', 'O(log n)', '探索範囲を毎回半分に絞り込む']
          ]
        },
        { type: 'example', label: '例題: 二分探索のトレース', html: '整列済み配列 [3, 7, 12, 18, 24, 31, 45, 52] から 24 を探す。<br>①中央値18と比較→24は18より大きいので右半分[24,31,45,52]<br>②中央値31と比較→24は31より小さいので左側[24]<br>③24と比較→一致<br>合計<strong>3回の比較</strong>で発見できる(線形探索なら最悪8回かかる)。' },
        {
          type: 'table',
          headers: ['整列アルゴリズム', '平均計算量', '最悪計算量', '特徴'],
          rows: [
            ['バブルソート', 'O(n²)', 'O(n²)', '隣り合う要素を比較し、逆順なら交換する操作を繰り返す'],
            ['選択ソート', 'O(n²)', 'O(n²)', '未整列部分から最小(または最大)値を探し、先頭と交換する'],
            ['クイックソート', 'O(n log n)', 'O(n²)', '基準値(ピボット)を用いてデータを分割しながら整列する'],
            ['マージソート', 'O(n log n)', 'O(n log n)', 'データを分割してそれぞれ整列し、併合(マージ)する']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <defs>
                <marker id="swapArrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#d64545"/>
                </marker>
              </defs>
              <g font-size="14" text-anchor="middle">
                <rect x="20" y="20" width="60" height="46" fill="#fdeaea" stroke="#d64545" stroke-width="2"/><text x="50" y="48" fill="#d64545">5</text>
                <rect x="90" y="20" width="60" height="46" fill="#fdeaea" stroke="#d64545" stroke-width="2"/><text x="120" y="48" fill="#d64545">3</text>
                <rect x="160" y="20" width="60" height="46" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/><text x="190" y="48" fill="#333">8</text>
                <rect x="230" y="20" width="60" height="46" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/><text x="260" y="48" fill="#333">1</text>
              </g>
              <text x="85" y="12" font-size="12" fill="#d64545" text-anchor="middle">比較: 5&gt;3 なので交換</text>
              <path d="M50,90 C50,110 120,110 120,90" fill="none" stroke="#d64545" stroke-width="2" marker-end="url(#swapArrow)"/>
              <text x="210" y="105" font-size="12" fill="#7b8794" text-anchor="middle">交換後: 3, 5, 8, 1 → 続けて5と8、8と1を比較していく</text>
            </svg>
          `,
          caption: 'バブルソートの1回目の比較: 隣り合う要素を左から順に比較し、大小が逆なら交換する。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「平均計算量」と「最悪計算量」は区別して覚える。クイックソートは平均O(n log n)と高速だが、ピボットの選び方が悪いと最悪O(n²)になる。同様に線形探索も、目的の値が先頭付近にあれば速いが、最悪(末尾または存在しない場合)はO(n)になる。' }
      ]
    },
    {
      title: 'サブルーチンと再帰、プログラムの実行方式',
      relatedExamples: '関連する出題例: 「処理の中で自分自身を呼び出す手法」「繰り返し使用する処理を1つのまとまりとして定義し、必要に応じて呼び出せるようにしたもの」「ソースコード全体を機械語に一括変換してから実行するプログラム言語の処理方式」など',
      blocks: [
        { type: 'paragraph', html: 'プログラム中で繰り返し利用する処理は、サブルーチン(関数、プロシージャ)としてまとめて定義し、必要な箇所から呼び出すことで、プログラムの再利用性・保守性を高めることができる。サブルーチンがその処理の中で自分自身を呼び出す手法を再帰(再帰呼び出し)と呼び、階乗の計算やフィボナッチ数列の計算などによく用いられる。' },
        { type: 'example', label: '例題: 再帰による階乗の計算 fact(3)', html: 'fact(n) を「n≦1なら1、そうでなければ n×fact(n-1)」と定義する。<br>fact(3) = 3 × fact(2)<br>fact(2) = 2 × fact(1)<br>fact(1) = 1(これ以上自分自身を呼び出さない基底条件)<br>結果を戻しながら計算すると fact(2)=2×1=2、fact(3)=3×2=<strong>6</strong>。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="13">
                <rect x="60" y="15" width="220" height="40" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="170" y="40" fill="#2f5fe0" text-anchor="middle">fact(3) = 3 × fact(2)</text>
                <rect x="80" y="65" width="200" height="40" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="180" y="90" fill="#1f9d55" text-anchor="middle">fact(2) = 2 × fact(1)</text>
                <rect x="100" y="115" width="180" height="40" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
                <text x="190" y="140" fill="#c9820a" text-anchor="middle">fact(1) = 1(基底条件)</text>
              </g>
              <text x="200" y="185" font-size="13" fill="#333" text-anchor="middle">戻りながら計算: fact(1)=1 → fact(2)=2×1=2 → fact(3)=3×2=6</text>
            </svg>
          `,
          caption: '再帰呼び出しは、呼び出すたびに処理が積み重なり(呼び出しの入れ子)、基底条件に達すると結果を戻しながら計算が確定していく。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '再帰では「これ以上自分自身を呼び出さずに値を確定させる条件(基底条件、上の例ではn≦1)」を必ず設ける必要がある。基底条件がないと自分自身の呼び出しが終わらず、処理が無限に続いてしまう。' },
        {
          type: 'table',
          headers: ['処理方式', '説明'],
          rows: [
            ['コンパイラ方式', 'ソースコード全体を事前に機械語(オブジェクトコード)へ一括変換してから実行する'],
            ['インタプリタ方式', 'ソースコードを1行(1文)ずつ解釈しながら実行する']
          ]
        }
      ]
    }
  ]
};
