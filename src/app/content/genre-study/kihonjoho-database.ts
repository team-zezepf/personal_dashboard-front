import { GenreContent } from '../../models/genre-content.models';

export const KIHONJOHO_DATABASE_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'database',
  genreName: 'データベース',
  category: 'テクノロジ系',
  description: 'テーブル設計・SQL操作・トランザクション管理など、データベースで問われる要点を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: 'リレーショナルデータベースの基本構造とキー',
      blocks: [
        { type: 'paragraph', html: 'リレーショナルデータベース(RDB)は、データを行(レコード)と列(フィールド・属性)からなる表(テーブル)の形式で管理する。1つの表の中で各行を一意に識別するために設定する列を主キーと呼び、値の重複やNULL(空)は許されない。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 110" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="13" text-anchor="middle">
                <rect x="0" y="10" width="140" height="35" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="70" y="32" fill="#2f5fe0" font-weight="bold">会員ID(主キー)</text>
                <rect x="140" y="10" width="140" height="35" fill="#f7f9fb" stroke="#c7cdd6"/>
                <text x="210" y="32" fill="#333">氏名</text>
                <rect x="280" y="10" width="140" height="35" fill="#f7f9fb" stroke="#c7cdd6"/>
                <text x="350" y="32" fill="#333">メールアドレス</text>

                <rect x="0" y="45" width="140" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/>
                <text x="70" y="65" fill="#2f5fe0">C001</text>
                <rect x="140" y="45" width="140" height="30" fill="#ffffff" stroke="#c7cdd6"/>
                <text x="210" y="65" fill="#333">佐藤 花子</text>
                <rect x="280" y="45" width="140" height="30" fill="#ffffff" stroke="#c7cdd6"/>
                <text x="350" y="65" fill="#333">sato@example.com</text>

                <rect x="0" y="75" width="140" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/>
                <text x="70" y="95" fill="#2f5fe0">C002</text>
                <rect x="140" y="75" width="140" height="30" fill="#ffffff" stroke="#c7cdd6"/>
                <text x="210" y="95" fill="#333">鈴木 一郎</text>
                <rect x="280" y="75" width="140" height="30" fill="#ffffff" stroke="#c7cdd6"/>
                <text x="350" y="95" fill="#333">suzuki@example.com</text>
              </g>
            </svg>
          `,
          caption: '「会員ID」列はどの行とも値が重複せず、各行を一意に特定できるため主キーになる。'
        },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['主キー(プライマリキー)', '表内の各行を一意に識別する列。値の重複・NULLは不可'],
            ['候補キー', '主キーの候補になりうる列(一意性を満たす列)。複数存在してよい'],
            ['複合キー', '複数の列を組み合わせて初めて一意性を満たすキー'],
            ['外部キー', '自分の表の列が、別の表の主キーを参照する形で設定するキー。表同士の関連付けと参照整合性の維持に使う']
          ]
        },
        { type: 'paragraph', html: 'なお、表形式に縛られずキーバリュー型・ドキュメント型など多様なデータモデルを扱うデータベースの総称をNoSQLデータベースと呼び、RDBとは異なる設計思想を持つ。' }
      ]
    },
    {
      title: 'E-R図とカーディナリティ(多重度)',
      blocks: [
        { type: 'paragraph', html: 'E-R図(実体関連図)は、データベースで扱う実体(エンティティ)同士の関係を図示したものである。実体間の対応関係の個数をカーディナリティ(多重度)といい、「1対1」「1対多」「多対多」の3種類で表す。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="12" text-anchor="middle">
                <text x="10" y="20" font-size="12" fill="#333" text-anchor="start" font-weight="bold">1対1</text>
                <rect x="60" y="8" width="90" height="30" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="105" y="28" fill="#2f5fe0">社員</text>
                <line x1="150" y1="23" x2="270" y2="23" stroke="#333" stroke-width="2"/>
                <text x="165" y="16" fill="#333">1</text>
                <text x="255" y="16" fill="#333">1</text>
                <rect x="270" y="8" width="90" height="30" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="315" y="28" fill="#2f5fe0">社員証</text>

                <text x="10" y="90" font-size="12" fill="#333" text-anchor="start" font-weight="bold">1対多</text>
                <rect x="60" y="78" width="90" height="30" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="105" y="98" fill="#1f9d55">顧客</text>
                <line x1="150" y1="93" x2="270" y2="93" stroke="#333" stroke-width="2"/>
                <text x="165" y="86" fill="#333">1</text>
                <text x="255" y="86" fill="#333">多</text>
                <rect x="270" y="78" width="90" height="30" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="315" y="98" fill="#1f9d55">注文</text>

                <text x="10" y="160" font-size="12" fill="#333" text-anchor="start" font-weight="bold">多対多</text>
                <rect x="60" y="148" width="90" height="30" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
                <text x="105" y="168" fill="#c9820a">生徒</text>
                <line x1="150" y1="163" x2="270" y2="163" stroke="#333" stroke-width="2"/>
                <text x="165" y="156" fill="#333">多</text>
                <text x="255" y="156" fill="#333">多</text>
                <rect x="270" y="148" width="90" height="30" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
                <text x="315" y="168" fill="#c9820a">授業</text>
              </g>
            </svg>
          `,
          caption: '1人の顧客が複数の注文を行うような関係が「1対多」。多対多の関係はRDBでは中間の表(関連実体)を挟んで表現する。'
        },
        {
          type: 'table',
          headers: ['カーディナリティ', '具体例'],
          rows: [
            ['1対1', '1人の社員に対し社員証が1枚だけ対応する'],
            ['1対多', '1人の顧客が複数の注文を行うが、1件の注文の顧客は1人'],
            ['多対多', '1人の生徒が複数の授業を受け、1つの授業に複数の生徒が参加する']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'どちら側が「多」なのかは、矢印(線)の両端に立って文章にして確認するとよい。「1人の顧客は複数の注文を行うことができるが、1件の注文は1人の顧客に対応する」ので顧客側が1、注文側が多となる。' }
      ]
    },
    {
      title: '正規化',
      blocks: [
        { type: 'paragraph', html: '正規化とは、データの重複を排除し、挿入・更新・削除時に矛盾(更新異常)が生じないようにテーブル構造を整理する設計手法である。逆に、検索速度などを優先してあえてデータを重複させる設計は非正規化(デノーマライゼーション)と呼ばれ、正規化とは目的が異なる。' },
        {
          type: 'table',
          headers: ['受注番号', '顧客名', '商品(繰り返し項目)'],
          rows: [
            ['1001', '山田太郎', 'ノートPC, マウス'],
            ['1002', '佐藤花子', 'キーボード']
          ]
        },
        {
          type: 'example',
          label: '例題: 非正規形 → 第1正規形',
          html: '上の表は1つのセル(商品欄)に複数の値が入っている「非正規形」である。1つのセルには1つの値だけが入るよう行を分割すると、次のようになる。<br>(1001, 山田太郎, ノートPC) / (1001, 山田太郎, マウス) / (1002, 佐藤花子, キーボード)<br>これが<strong>第1正規形</strong>である。'
        },
        { type: 'paragraph', html: '正規化はさらに段階を踏んで進む。第2正規形は複合キーの一部だけに従属する項目(部分関数従属)を分離した状態、第3正規形はキー以外の項目同士が従属関係(推移的関数従属)を持つ場合にそれも分離した状態である。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '正規化は「データの重複を排除して更新時の矛盾を防ぐ」ための設計であり、「検索速度を高めるためにあえてデータを重複させる」非正規化とは逆方向の考え方である。両者を混同しないこと。' }
      ]
    },
    {
      title: 'SQLの基本操作(SELECT・WHERE・JOIN)',
      blocks: [
        { type: 'paragraph', html: 'SQLの基本命令には、検索のSELECT、追加のINSERT、更新のUPDATE、削除のDELETEがある。SELECT文でどの表(FROM句)からどの条件(WHERE句)でデータを取り出すかを指定する。' },
        {
          type: 'example',
          label: '例題: 条件を指定して抽出する',
          html: 'テーブル「社員」から部署が「営業部」の氏名だけを取り出したい場合、次のように書く。<br>SELECT 氏名 FROM 社員 WHERE 部署 = \'営業部\';<br><strong>WHERE句</strong>が抽出条件(絞り込み条件)を指定する部分である。'
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <ellipse cx="160" cy="80" rx="90" ry="60" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2" fill-opacity="0.75"/>
              <ellipse cx="240" cy="80" rx="90" ry="60" fill="#eafaf0" stroke="#1f9d55" stroke-width="2" fill-opacity="0.75"/>
              <text x="105" y="65" font-size="14" fill="#2f5fe0" text-anchor="middle">テーブルA</text>
              <text x="295" y="65" font-size="14" fill="#1f9d55" text-anchor="middle">テーブルB</text>
              <text x="200" y="100" font-size="13" fill="#333" text-anchor="middle" font-weight="bold">共通のキーを</text>
              <text x="200" y="116" font-size="13" fill="#333" text-anchor="middle" font-weight="bold">持つ行</text>
            </svg>
          `,
          caption: 'INNER JOIN(内部結合)は、両方のテーブルに共通するキーを持つ行だけを結合する(2つの円の重なり部分)。'
        },
        {
          type: 'table',
          headers: ['結合(JOIN)の種類', '取得される行'],
          rows: [
            ['INNER JOIN(内部結合)', '両方のテーブルでキーが一致する行だけ'],
            ['LEFT OUTER JOIN(左外部結合)', '左側の全行+一致するBの値(なければNULL)'],
            ['RIGHT OUTER JOIN(右外部結合)', '右側の全行+一致するAの値(なければNULL)'],
            ['FULL OUTER JOIN(完全外部結合)', '両方の全行(一致しない側はNULLで補う)']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'INNER JOINは「一致する行だけ」を残すため、キーが対応しない行は結果から消える。片方のテーブルの行を漏らさず残したい場合はOUTER JOIN(LEFT/RIGHT/FULL)を使う必要があり、単に「JOIN」とだけ書くとINNER JOINになる点に注意。' }
      ]
    },
    {
      title: 'インデックスとビュー',
      blocks: [
        { type: 'paragraph', html: 'インデックス(索引)は、本の索引のように、特定の列の値をあらかじめ整理しておくことで検索速度を向上させる仕組みである。多くのRDBMSではB-tree(B木)と呼ばれる木構造が使われ、全件を走査せずに少ない比較回数で目的の行にたどり着ける。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="160" y="10" width="80" height="30" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="200" y="30" font-size="12" fill="#2f5fe0" text-anchor="middle">50</text>

              <line x1="180" y1="40" x2="100" y2="70" stroke="#333" stroke-width="1.5"/>
              <line x1="220" y1="40" x2="300" y2="70" stroke="#333" stroke-width="1.5"/>

              <rect x="60" y="70" width="80" height="30" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="100" y="90" font-size="12" fill="#1f9d55" text-anchor="middle">20,35</text>
              <rect x="260" y="70" width="80" height="30" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="300" y="90" font-size="12" fill="#1f9d55" text-anchor="middle">70,90</text>

              <line x1="80" y1="100" x2="40" y2="130" stroke="#333" stroke-width="1.5"/>
              <line x1="120" y1="100" x2="160" y2="130" stroke="#333" stroke-width="1.5"/>
              <line x1="280" y1="100" x2="240" y2="130" stroke="#333" stroke-width="1.5"/>
              <line x1="320" y1="100" x2="360" y2="130" stroke="#333" stroke-width="1.5"/>

              <rect x="10" y="130" width="60" height="25" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="40" y="147" font-size="11" fill="#333" text-anchor="middle">…20</text>
              <rect x="130" y="130" width="60" height="25" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="160" y="147" font-size="11" fill="#333" text-anchor="middle">35…</text>
              <rect x="210" y="130" width="60" height="25" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="240" y="147" font-size="11" fill="#333" text-anchor="middle">70…</text>
              <rect x="330" y="130" width="60" height="25" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="360" y="147" font-size="11" fill="#333" text-anchor="middle">90…</text>
            </svg>
          `,
          caption: 'B-tree構造の索引のイメージ。値の大小で木をたどり、目的の行を少ない比較回数で見つけられる。'
        },
        {
          type: 'table',
          headers: ['項目', 'インデックス', 'ビュー'],
          rows: [
            ['目的', '検索速度の向上', '複雑な問い合わせの再利用・簡略化'],
            ['実データの保持', '保持しない(元データを指し示す構造)', '保持しない(SELECT結果を都度表示する仮想表)'],
            ['更新への影響', '列の更新のたびに索引も再構築され、更新コストが増える', '元テーブルの更新内容がそのままビューにも反映される']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'インデックスは検索(SELECT)を速くする一方、更新(INSERT/UPDATE/DELETE)のたびに索引の再構築が必要になるためオーバーヘッドが増える。「多いほど良い」わけではない点に注意。' }
      ]
    },
    {
      title: 'トランザクション管理(ACID特性)と排他制御',
      blocks: [
        { type: 'paragraph', html: '一連の更新処理をひとまとまりとして扱う単位をトランザクションという。トランザクションが備えるべき4つの性質の頭文字を取ってACID特性と呼ぶ。' },
        {
          type: 'table',
          headers: ['性質', '英語', '内容'],
          rows: [
            ['原子性', 'Atomicity', '処理の途中経過が残らず、すべて実行されるか全く実行されないかのいずれかになる'],
            ['一貫性', 'Consistency', 'トランザクションの前後でデータベースの整合性(制約)が保たれる'],
            ['独立性(分離性)', 'Isolation', '複数のトランザクションを同時に実行しても、互いに影響を与えない'],
            ['持続性', 'Durability', 'コミットした結果は、障害が起きてもデータベースに残り続ける']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 180" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="70" width="110" height="40" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="65" y="94" font-size="13" fill="#2f5fe0" text-anchor="middle">更新処理開始</text>

              <line x1="150" y1="90" x2="150" y2="40" stroke="#333" stroke-width="1.5"/>
              <line x1="150" y1="90" x2="150" y2="140" stroke="#333" stroke-width="1.5"/>
              <line x1="120" y1="90" x2="150" y2="90" stroke="#333" stroke-width="1.5"/>

              <line x1="150" y1="40" x2="170" y2="40" stroke="#333" stroke-width="1.5"/>
              <rect x="170" y="20" width="90" height="40" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="215" y="44" font-size="13" fill="#1f9d55" text-anchor="middle">正常終了</text>
              <line x1="260" y1="40" x2="320" y2="40" stroke="#333" stroke-width="2"/>
              <rect x="320" y="20" width="90" height="40" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="365" y="44" font-size="13" fill="#1f9d55" text-anchor="middle">コミット</text>

              <line x1="150" y1="140" x2="170" y2="140" stroke="#333" stroke-width="1.5"/>
              <rect x="170" y="120" width="90" height="40" rx="6" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="215" y="144" font-size="13" fill="#d64545" text-anchor="middle">異常発生</text>
              <line x1="260" y1="140" x2="320" y2="140" stroke="#333" stroke-width="2"/>
              <rect x="320" y="120" width="90" height="40" rx="6" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="365" y="144" font-size="13" fill="#d64545" text-anchor="middle">ロールバック</text>
            </svg>
          `,
          caption: '処理が正常に終わればコミットで更新内容を確定し、途中で異常が起きればロールバックで開始前の状態に戻す。'
        },
        { type: 'example', label: '例題: 排他制御とは', html: '複数の利用者が同じ口座残高を同時に更新すると、後の更新が先の更新を上書きしてしまい整合性が崩れるおそれがある。そこで更新中の行にロックをかけ、他の処理からの同時更新を待たせる仕組みが<strong>排他制御</strong>である。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '排他制御(ロックの仕組みそのもの)と、デッドロック(複数の処理が互いに相手のロック解除を待ち続け、どちらも先に進めなくなる状態)は別の概念。また、コミット(更新確定)とロールバック(更新取り消し)も対になる操作として混同しないこと。' }
      ]
    }
  ]
};
