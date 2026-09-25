import { GenreContent } from '../../models/genre-content.models';

export const OYOJOHO_DATABASE_CONTENT: GenreContent = {
  examType: 'oyojoho',
  genreKey: 'database',
  genreName: 'データベース',
  category: 'テクノロジ系',
  description: '正規化の実践的な適用、SQLの結合・集計・副問い合わせ、トランザクション制御(ACID特性・排他制御・デッドロック)、インデックスや分散データベースの設計判断など、応用情報技術者試験のデータベース分野で問われる実践的な知識を整理しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '正規化の実践(関数従属性と第2〜第3正規形)',
      blocks: [
        {
          type: 'paragraph',
          html: '正規化を実践的に適用するには、ある属性が別のどの属性(または属性の組)によって値が一意に定まるかという関数従属性を見極める必要がある。複合キーの一部だけに従属する状態を部分関数従属、複合キー全体に従属する状態を完全関数従属という。第2正規形は、非キー属性がすべて候補キーに完全関数従属する(部分関数従属を持たない)状態である。さらに、非キー属性が他の非キー属性を経由して間接的にキーへ従属する状態を推移的関数従属といい、これを持たない状態が第3正規形である。'
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 210" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="12" text-anchor="middle">
                <rect x="5" y="10" width="110" height="34" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="60" y="32" fill="#2f5fe0" font-weight="bold">受注番号(PK)</text>
                <rect x="125" y="10" width="110" height="34" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="180" y="32" fill="#2f5fe0" font-weight="bold">商品番号(PK)</text>

                <rect x="65" y="95" width="100" height="34" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="115" y="117" fill="#1f9d55">数量</text>
                <line x1="60" y1="44" x2="105" y2="95" stroke="#1f9d55" stroke-width="2"/>
                <line x1="180" y1="44" x2="135" y2="95" stroke="#1f9d55" stroke-width="2"/>
                <text x="185" y="75" fill="#1f9d55" font-size="11">完全関数従属</text>

                <rect x="270" y="55" width="115" height="34" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
                <text x="327" y="77" fill="#c9820a">顧客ID</text>
                <line x1="60" y1="44" x2="280" y2="58" stroke="#c9820a" stroke-width="2" stroke-dasharray="4,3"/>
                <text x="220" y="42" fill="#c9820a" font-size="11">部分関数従属</text>

                <rect x="270" y="150" width="115" height="34" rx="6" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
                <text x="327" y="172" fill="#d64545">顧客名</text>
                <line x1="327" y1="89" x2="327" y2="150" stroke="#d64545" stroke-width="2"/>
                <text x="327" y="130" fill="#d64545" font-size="11">推移的関数従属</text>
              </g>
            </svg>
          `,
          caption: '数量は複合キー全体に完全関数従属する。顧客IDは受注番号だけに部分関数従属し、顧客名は非キー属性の顧客IDに推移的関数従属している。'
        },
        {
          type: 'example',
          label: '例題: 非正規形から第3正規形への分解',
          html: '受注明細(受注番号, 商品番号, 商品名, 数量, 顧客ID, 顧客名)という1つの表があり、主キーは{受注番号, 商品番号}とする。<br>まず部分関数従属(商品番号→商品名、受注番号→顧客ID・顧客名)を分離して<strong>第2正規形</strong>にする。<br>受注明細(受注番号, 商品番号, 数量) / 受注(受注番号, 顧客ID, 顧客名) / 商品(商品番号, 商品名)<br>次に、受注表に残る推移的関数従属(顧客ID→顧客名)をさらに分離すると<strong>第3正規形</strong>になる。<br>受注明細(受注番号, 商品番号, 数量) / 受注(受注番号, 顧客ID) / 顧客(顧客ID, 顧客名) / 商品(商品番号, 商品名)'
        },
        {
          type: 'pitfall',
          label: 'つまずきやすいポイント',
          html: '第3正規形の定義には「第2正規形の条件を満たした上で」という前提が含まれる。部分関数従属が残ったまま推移的関数従属だけを取り除いても第3正規形にはならない点に注意する。また、選択肢としてよく登場するボイス・コッド正規形(BCNF)は第3正規形よりもさらに強い制約(すべての決定項が候補キーであること)を課す、一段進んだ正規形であり、第3正規形と同一視しないこと。'
        }
      ]
    },
    {
      title: 'SQLの結合・集計・副問い合わせと関係代数',
      blocks: [
        {
          type: 'paragraph',
          html: 'SQLの操作は、理論的には関係代数と呼ばれる演算の組み合わせで説明できる。行を条件で絞り込む操作を選択(セレクション)、列を絞り込む操作を射影(プロジェクション)、複数の表を共通の列の値で結び付ける操作を結合(ジョイン)という。SQLではそれぞれWHERE句、SELECT句の列リスト、JOIN句が対応する。'
        },
        {
          type: 'table',
          headers: ['関係代数の演算', 'SQLでの対応', '内容'],
          rows: [
            ['選択(セレクション)', 'WHERE句', '指定した条件に一致する行だけを取り出す'],
            ['射影(プロジェクション)', 'SELECT句の列リスト', '指定した列だけを取り出す(行の絞り込みではない点に注意)'],
            ['結合(ジョイン)', 'JOIN句', '複数の表を共通の列の値をもとに結び付ける']
          ]
        },
        {
          type: 'example',
          label: '例題: OUTER JOINとGROUP BY・HAVINGの組み合わせ',
          html: '社員(社員ID, 氏名, 部門コード, 給与)と部門(部門コード, 部門名)という2つの表から、部門ごとの平均給与が400万円以上の部門名と平均給与を求めるには次のように書く。<br>SELECT 部門.部門名, AVG(社員.給与) AS 平均給与<br>FROM 社員<br>LEFT OUTER JOIN 部門 ON 社員.部門コード = 部門.部門コード<br>GROUP BY 部門.部門名<br>HAVING AVG(社員.給与) >= 4000000;<br><strong>LEFT OUTER JOIN</strong>を使うことで、対応する部門コードが部門表に存在しない社員の行も欠落させずに残せる(部門名はNULLになる)。GROUP BY句で部門ごとにグループ化した後、<strong>HAVING句</strong>で集計結果(平均給与)に対する条件を指定する。'
        },
        {
          type: 'example',
          label: '例題: サブクエリ(副問い合わせ)を使った比較',
          html: '全社員の平均給与より高い給与をもらっている社員の氏名と給与を求めるには、サブクエリを使って次のように書く。<br>SELECT 氏名, 給与 FROM 社員<br>WHERE 給与 > (SELECT AVG(給与) FROM 社員);<br>かっこ内の<strong>サブクエリ</strong>が先に実行され、全社員の平均給与という1つの値(スカラ値)を返す。外側のクエリは、その値より給与が高い行だけをWHERE句で絞り込む。'
        },
        {
          type: 'pitfall',
          label: 'つまずきやすいポイント',
          html: 'WHERE句は集計(GROUP BY)前の個々の行に対する絞り込み条件であり、HAVING句は集計後の集計結果(AVGやSUMなど)に対する絞り込み条件である。集計関数を使った条件を誤ってWHERE句に書くとエラーになるか意図と異なる結果になる。また、関係代数の「射影」は列を絞り込む操作であり、行を絞り込む「選択」と名前が似ているため混同しやすい。'
        }
      ]
    },
    {
      title: 'トランザクション制御(ACID特性・排他制御・デッドロック)',
      blocks: [
        {
          type: 'paragraph',
          html: '複数の利用者が同時に同一のデータへアクセスしても整合性が損なわれないようにする仕組みを排他制御という。更新対象の行やページにロック(共有ロック・専有ロックなど)をかけ、他のトランザクションからの同時アクセスを制限する。トランザクションが備えるべき4つの性質(ACID特性)のうち、独立性(Isolation)はこの排他制御によって実現される。'
        },
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
          type: 'table',
          headers: ['分離レベル', '起こりうる問題'],
          rows: [
            ['READ UNCOMMITTED', 'ダーティリード・ノンリピータブルリード・ファントムリードのすべてが起こりうる'],
            ['READ COMMITTED', 'ダーティリードは防げるが、ノンリピータブルリード・ファントムリードは起こりうる'],
            ['REPEATABLE READ', 'ダーティリード・ノンリピータブルリードは防げるが、ファントムリードは起こりうる'],
            ['SERIALIZABLE', '最も厳格な分離レベルで、上記の問題はすべて防げる(その分、同時実行性は下がる)']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="12" text-anchor="middle">
                <rect x="5" y="10" width="120" height="36" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="65" y="33" fill="#2f5fe0" font-weight="bold">トランザクションT1</text>

                <rect x="275" y="10" width="120" height="36" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="335" y="33" fill="#1f9d55" font-weight="bold">トランザクションT2</text>

                <rect x="5" y="150" width="120" height="36" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
                <text x="65" y="173" fill="#333">資源A(行X)</text>

                <rect x="275" y="150" width="120" height="36" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
                <text x="335" y="173" fill="#333">資源B(行Y)</text>

                <line x1="65" y1="150" x2="65" y2="46" stroke="#2f5fe0" stroke-width="2"/>
                <text x="30" y="100" fill="#2f5fe0" font-size="11">保有</text>

                <line x1="122" y1="30" x2="278" y2="163" stroke="#d64545" stroke-width="2" stroke-dasharray="5,4"/>
                <text x="200" y="75" fill="#d64545" font-size="11">要求(待ち)</text>

                <line x1="335" y1="150" x2="335" y2="46" stroke="#1f9d55" stroke-width="2"/>
                <text x="372" y="100" fill="#1f9d55" font-size="11">保有</text>

                <line x1="278" y1="30" x2="122" y2="163" stroke="#d64545" stroke-width="2" stroke-dasharray="5,4"/>
                <text x="200" y="135" fill="#d64545" font-size="11">要求(待ち)</text>
              </g>
            </svg>
          `,
          caption: 'T1は資源Aを保有したまま資源Bを要求し、T2は資源Bを保有したまま資源Aを要求している。互いに相手のロック解除を待ち続ける循環状態がデッドロックである。'
        },
        {
          type: 'pitfall',
          label: 'つまずきやすいポイント',
          html: 'デッドロックが検出されると、DBMSはいずれか一方のトランザクションを強制的にロールバックして解消する。「先にロックを獲得した側が優先される」といった単純な規則ではない。また、排他制御(ロックによる同時アクセス制御そのもの)とデッドロック(その結果起こりうる処理停止状態)は別の概念であり、両者を同一視しないこと。'
        }
      ]
    },
    {
      title: 'インデックス(B木)と分散データベースの設計判断',
      blocks: [
        {
          type: 'paragraph',
          html: '大量データを扱う表では、目的の行を効率よく探し出すためにインデックス(索引)を設定する。多くのRDBMSでは、キーの大小関係を保ったまま木構造でデータを整理するB木、特にリーフノード同士を連結して範囲検索を高速化したB+木が採用されている。B木・B+木は平衡木であり、木の深さがデータ量の対数(log)に比例するため、行数が増えても検索に必要な比較回数の増加は緩やかである。'
        },
        {
          type: 'table',
          headers: ['探索方法', '平均的な検索計算量', '特徴'],
          rows: [
            ['線形探索(全件走査)', 'O(n)', 'インデックスなしで先頭から順に比較する。データ量に比例して遅くなる'],
            ['B木/B+木によるインデックス探索', 'O(log n)', '多くのRDBMSの標準的なインデックス構造。範囲検索や順序付き取得にも強い'],
            ['ハッシュインデックス', '平均O(1)', '等価条件の検索は高速だが、範囲検索(以上・以下など)には利用できない']
          ]
        },
        {
          type: 'pitfall',
          label: 'つまずきやすいポイント',
          html: 'インデックスは検索(SELECT)を高速化する一方、行の追加・更新・削除のたびにインデックス自体も再構築されるため更新コストは増える。「インデックスは張れば張るほど良い」わけではなく、更新頻度や検索パターンを踏まえて設計する必要がある。'
        },
        {
          type: 'paragraph',
          html: '複数のノードにデータを分散して保持する分散データベースでは、ネットワーク分断が起きた場合に一貫性(Consistency)・可用性(Availability)・分断耐性(Partition tolerance)の3つを同時に満たすことはできないとするCAP定理が知られている。'
        },
        {
          type: 'table',
          headers: ['特性', '英語', '内容'],
          rows: [
            ['一貫性', 'Consistency', 'どのノードにアクセスしても、常に最新で同じデータが返る'],
            ['可用性', 'Availability', '一部のノードに障害が起きても、常に何らかの応答が返る'],
            ['分断耐性', 'Partition tolerance', 'ネットワーク分断(ノード間通信の断絶)が起きてもシステム全体が機能し続ける']
          ]
        },
        {
          type: 'example',
          label: '例題: CAP定理とBASE特性の関係',
          html: '現実の分散システムではネットワーク分断は起こりうる前提とせざるを得ないため、分断耐性(P)は事実上必須とされ、実際の設計判断は一貫性(C)と可用性(A)のどちらを優先するか(CP型かAP型か)という選択になることが多い。多くのNoSQLデータベースは、厳格な整合性より可用性を重視する<strong>BASE特性</strong>(Basically Available, Soft state, Eventually consistent:基本的に利用可能で、状態は変化しうるが最終的には整合性が取れる)という設計思想を採用している。'
        },
        {
          type: 'pitfall',
          label: 'つまずきやすいポイント',
          html: 'ACID特性(伝統的なRDBが重視する厳格な整合性)とBASE特性(分散NoSQLが重視する可用性優先・結果整合性)は対照的な設計思想であり、混同しないこと。またCAP定理は「3つのうち任意の2つを自由に選べる」という単純な話ではなく、実際に分断が発生した瞬間にCとAのどちらを優先するかという判断を迫られる、という点を理解しておく。'
        }
      ]
    }
  ]
};
