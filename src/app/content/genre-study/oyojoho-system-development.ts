import { GenreContent } from '../../models/genre-content.models';

export const OYOJOHO_SYSTEM_DEVELOPMENT_CONTENT: GenreContent = {
  examType: 'oyojoho',
  genreKey: 'system-development',
  genreName: 'システム開発技術',
  category: 'テクノロジ系',
  description: '開発モデルの使い分け、UML図の読解、テスト技法、デザインパターンなど、応用情報技術者試験で問われるシステム開発技術の応用的な知識を解説しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '開発工程と開発モデルの使い分け',
      blocks: [
        { type: 'paragraph', html: 'システム開発は、利用者の業務内容やニーズを分析して機能・性能を明確化する「要件定義」を起点に進む。この要件定義以降をどのような順序・サイクルで開発していくかを定めたものが開発モデルであり、応用情報技術者試験では、プロジェクトの特性(要件の変化しやすさ、規模、リスクなど)に応じて<strong>適切な開発モデルを選べるか</strong>が問われる。' },
        {
          type: 'table',
          headers: ['モデル', '進め方', '特徴', '向いているプロジェクト'],
          rows: [
            ['ウォーターフォールモデル', '要件定義→設計→実装→テストの各工程を後戻りしない前提で順番に1回だけ実施する', '計画が立てやすく進捗管理がしやすいが、途中の仕様変更に弱い', '要件が early に確定しており、変更が少ない大規模プロジェクト'],
            ['アジャイル開発(スクラムなど)', 'スプリントと呼ばれる短い固定期間(1〜4週間程度)で計画・実装・レビューを反復し、優先度の高い項目から順に作り込む', '仕様変更や利用者フィードバックに柔軟に対応できるが、全体スケジュールの見通しは立てづらい', '要件が固まりきっておらず、変化が見込まれる開発'],
            ['スパイラルモデル', 'リスク分析→試作(プロトタイプ)→評価を反復しながら、少しずつ完成度を高めていく', '反復のたびにリスク分析を行う点が特徴で、大規模・高リスクな開発のリスク低減に向く', '技術的リスクが高く、初期段階でリスクを洗い出したい大規模開発'],
            ['V(V字)モデル', 'ウォーターフォールをV字型に描き、各設計工程と対応するテスト工程(要件定義⇔受入テスト等)を明確に対応付ける', '開発順序自体はウォーターフォールと同じで、各工程の検証範囲を明確にする点に主眼がある', '品質保証・テスト計画を工程ごとに厳密に管理したい開発']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <defs>
                <marker id="arrow1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#7b8794"/>
                </marker>
              </defs>
              <text x="10" y="18" font-size="12" fill="#333" font-weight="bold">ウォーターフォール(一方向・反復なし)</text>
              <rect x="10" y="28" width="85" height="32" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="52" y="49" font-size="11" fill="#2f5fe0" text-anchor="middle">要件定義</text>
              <rect x="115" y="28" width="85" height="32" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="157" y="49" font-size="11" fill="#2f5fe0" text-anchor="middle">設計</text>
              <rect x="220" y="28" width="85" height="32" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="262" y="49" font-size="11" fill="#2f5fe0" text-anchor="middle">実装</text>
              <rect x="325" y="28" width="85" height="32" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="367" y="49" font-size="11" fill="#2f5fe0" text-anchor="middle">テスト</text>
              <line x1="95" y1="44" x2="113" y2="44" stroke="#7b8794" stroke-width="2" marker-end="url(#arrow1)"/>
              <line x1="200" y1="44" x2="218" y2="44" stroke="#7b8794" stroke-width="2" marker-end="url(#arrow1)"/>
              <line x1="305" y1="44" x2="323" y2="44" stroke="#7b8794" stroke-width="2" marker-end="url(#arrow1)"/>

              <text x="10" y="100" font-size="12" fill="#333" font-weight="bold">スクラム(アジャイル): スプリントを反復</text>
              <rect x="70" y="112" width="90" height="30" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="115" y="131" font-size="11" fill="#1f9d55" text-anchor="middle">計画</text>
              <rect x="250" y="112" width="90" height="30" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="295" y="131" font-size="11" fill="#1f9d55" text-anchor="middle">実装</text>
              <rect x="250" y="162" width="90" height="30" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="295" y="181" font-size="11" fill="#1f9d55" text-anchor="middle">レビュー</text>
              <rect x="70" y="162" width="90" height="30" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="115" y="181" font-size="11" fill="#1f9d55" text-anchor="middle">ふりかえり</text>
              <line x1="160" y1="127" x2="248" y2="127" stroke="#7b8794" stroke-width="2" marker-end="url(#arrow1)"/>
              <line x1="295" y1="142" x2="295" y2="160" stroke="#7b8794" stroke-width="2" marker-end="url(#arrow1)"/>
              <line x1="250" y1="177" x2="162" y2="177" stroke="#7b8794" stroke-width="2" marker-end="url(#arrow1)"/>
              <line x1="115" y1="162" x2="115" y2="144" stroke="#7b8794" stroke-width="2" marker-end="url(#arrow1)"/>
              <text x="115" y="210" font-size="10" fill="#1f9d55" text-anchor="middle">1スプリント(短期間)ごとに繰り返す</text>
            </svg>
          `,
          caption: 'ウォーターフォールは要件定義からテストまでを一方向に1回で進めるのに対し、スクラムでは「計画→実装→レビュー→ふりかえり」という短いスプリントを繰り返しながら、優先度の高い項目から順に作り込んでいく。'
        },
        { type: 'example', label: '例: 開発モデルの選び方', html: '「新規Webサービスを立ち上げるが、利用者の反応を見ながら機能の優先順位や仕様を頻繁に見直したい」という状況では、要件を最初に固定するウォーターフォールモデルは不向きである。短いスプリント単位で実装とレビューを繰り返し、優先度の高い機能から順にリリースできる<strong>アジャイル開発(スクラム)</strong>が適している。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'スパイラルモデルとアジャイル開発は、どちらも「反復」を伴う点で似ているため混同しやすい。スパイラルモデルは反復のたびに<strong>リスク分析</strong>を行い品質・リスクを段階的に詰めていく重量級のモデルであるのに対し、アジャイル(スクラム)は短いスプリントで<strong>顧客フィードバック</strong>を得ながら軽快に開発を進める点が異なる。また「V字モデル」は名前だけ見るとテスト技法と誤解しやすいが、実際は開発工程とテスト工程の対応関係を示す<strong>開発モデルの一種</strong>である。' }
      ]
    },
    {
      title: 'UML図の読解(クラス図を中心に)',
      blocks: [
        { type: 'paragraph', html: 'UML(統一モデリング言語)は、システムの構造や振る舞いを図で表現するための標準的な表記法である。応用情報技術者試験では、個々の図の名称を覚えるだけでなく、それぞれの図が「システムの静的な構造」を表すのか「時系列・処理の流れといった動的な振る舞い」を表すのかを見分ける力が問われる。' },
        {
          type: 'table',
          headers: ['図の種類', '表現する内容', '静的/動的'],
          rows: [
            ['クラス図', 'クラスの属性・操作、およびクラス間の関連(集約・継承など)といったシステムの静的な構造', '静的'],
            ['シーケンス図', 'オブジェクト間でやり取りされるメッセージを、時間の流れに沿って表す', '動的'],
            ['ユースケース図', '利用者(アクター)がシステムに対して何を行うか(ユースケース)、およびその関係を表す', '要求・機能の全体像'],
            ['アクティビティ図', '業務処理や処理手順の流れ、条件分岐・並行処理などを表す', '動的']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="15" y="15" width="150" height="100" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <line x1="15" y1="45" x2="165" y2="45" stroke="#2f5fe0" stroke-width="1.5"/>
              <line x1="15" y1="80" x2="165" y2="80" stroke="#2f5fe0" stroke-width="1.5"/>
              <text x="90" y="33" font-size="12" fill="#2f5fe0" text-anchor="middle" font-weight="bold">注文</text>
              <text x="22" y="60" font-size="10" fill="#2f5fe0">－注文日 : Date</text>
              <text x="22" y="73" font-size="10" fill="#2f5fe0">－金額 : int</text>
              <text x="22" y="97" font-size="10" fill="#2f5fe0">＋注文する()</text>

              <rect x="235" y="15" width="150" height="100" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <line x1="235" y1="45" x2="385" y2="45" stroke="#1f9d55" stroke-width="1.5"/>
              <line x1="235" y1="80" x2="385" y2="80" stroke="#1f9d55" stroke-width="1.5"/>
              <text x="310" y="33" font-size="12" fill="#1f9d55" text-anchor="middle" font-weight="bold">商品</text>
              <text x="242" y="60" font-size="10" fill="#1f9d55">－商品名 : String</text>
              <text x="242" y="73" font-size="10" fill="#1f9d55">－価格 : int</text>
              <text x="242" y="97" font-size="10" fill="#1f9d55">＋在庫を確認する()</text>

              <line x1="165" y1="65" x2="235" y2="65" stroke="#333" stroke-width="1.5"/>
              <text x="200" y="58" font-size="10" fill="#333" text-anchor="middle">含む</text>
              <text x="172" y="80" font-size="9" fill="#333">1</text>
              <text x="212" y="80" font-size="9" fill="#333">0..*</text>
            </svg>
          `,
          caption: 'クラス図の例: 各クラスは「クラス名/属性/操作」の3段で表され、クラス間の関連には多重度(1、0..*など)を付記する。この例は「1件の注文には1つ以上の商品が含まれる」という関連を表している。'
        },
        { type: 'example', label: '例: 多重度の読み取り方', html: '注文クラス側の多重度「1」と商品クラス側の多重度「0..*」を関連の両端で読む。商品側の「0..*」は「1件の注文に対して商品が0個以上(複数可)対応する」ことを意味し、逆に注文側の「1」は「1つの商品明細行は必ず1件の注文に属する」ことを意味する。多重度は<strong>関連線の相手側の端</strong>に付ける値であることに注意する。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「オブジェクト間でやり取りされるメッセージを時系列で表す図」はシーケンス図であり、クラス図と混同しやすい。クラス図は<strong>構造(何がある/何とつながっているか)</strong>を表す静的な図、シーケンス図は<strong>振る舞い(いつ何をやり取りするか)</strong>を表す動的な図であるという軸で区別するとよい。問題文に「時系列」「メッセージのやり取り」とあればシーケンス図、「属性」「操作」「関連」とあればクラス図と判断する。' }
      ]
    },
    {
      title: 'テスト技法(ホワイトボックス/ブラックボックス)',
      blocks: [
        { type: 'paragraph', html: 'テストの技法は、テストケースを何に基づいて設計するかによって大きく2つに分類される。プログラムの内部構造(制御フロー)に着目する<strong>ホワイトボックステスト</strong>と、内部構造は考慮せず入力と出力の仕様のみに着目する<strong>ブラックボックステスト</strong>である。' },
        {
          type: 'table',
          headers: ['技法', '着目点', '代表的な基準・技法', '特徴'],
          rows: [
            ['ホワイトボックステスト', 'プログラムの内部構造(制御フロー)', '命令網羅、分岐網羅(判定条件網羅)、条件網羅', 'ソースコードの処理経路をどこまで網羅的に通すかでテストケースを設計する'],
            ['ブラックボックステスト', '入力と出力の仕様(内部構造は見ない)', '同値分割、境界値分析', '仕様通りに動作するかを、実装の中身を意識せずに検証する']
          ]
        },
        { type: 'example', label: '例: 命令網羅と分岐網羅の違い', html: '次の疑似コードを考える。<br><code>if (a &gt; 0) { x = 1; } else { x = -1; }</code><br>命令網羅(C0網羅)は「すべての命令を最低1回は実行する」基準であるため、<code>a = 1</code>のような1つのテストケースだけでは<code>if</code>側しか通らず不十分である。分岐網羅(C1網羅)は「すべての分岐(true/false)を最低1回は通す」基準であるため、<code>a = 1</code>(true側)と<code>a = -1</code>(false側)の<strong>2つのテストケース</strong>が必要になる。分岐網羅は命令網羅より厳しい基準である。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「内部構造(ソースコード)に着目する」という表現が出てきたら<strong>ホワイトボックステスト</strong>、「入出力の仕様のみに着目する」という表現が出てきたら<strong>ブラックボックステスト</strong>と判断する。回帰テスト(リグレッションテスト)は、プログラム修正後に既存機能へ悪影響が出ていないかを確認するテストであり、ホワイトボックス/ブラックボックスという着眼点の分類とは<strong>別の軸</strong>の概念である点に注意する。' }
      ]
    },
    {
      title: 'デザインパターンと保守技術',
      blocks: [
        { type: 'paragraph', html: '保守性・拡張性の高いソフトウェアを実現するため、設計段階でよく使われる典型的な設計上の工夫を<strong>デザインパターン</strong>と呼ぶ。また、運用開始後のコードに対して行う代表的な保守技術としてリファクタリングがある。いずれも「何のために・何を変える/変えないのか」を正確に区別することが重要である。' },
        {
          type: 'table',
          headers: ['種別', '名称', '目的・内容'],
          rows: [
            ['デザインパターン', 'Singleton(シングルトン)パターン', 'あるクラスのインスタンスがシステム全体で常に1つだけ存在することを保証し、そこへの共通のアクセス手段を提供する'],
            ['デザインパターン', 'Factory Methodパターン', 'インスタンスの生成方法をサブクラス側に委譲し、生成処理の詳細を利用側から分離する'],
            ['デザインパターン', 'Observerパターン', 'あるオブジェクトの状態変化を、それを監視する複数のオブジェクトに自動的に通知する'],
            ['デザインパターン', 'Adapterパターン', 'インタフェースが異なるクラスを、既存のコードの呼び出し方に合わせて変換して利用できるようにする'],
            ['保守技術', 'リファクタリング', '外部から見た動作(仕様)を<strong>変えずに</strong>、可読性・保守性を高める目的でソースコードの内部構造を整理・改善する']
          ]
        },
        { type: 'example', label: '例: Singletonパターンが適する場面', html: 'アプリケーション全体で共有する設定情報管理クラスやログ出力クラスのように、「インスタンスが複数存在すると設定値やログの整合性が崩れてしまう」ものに対してSingletonパターンを適用する。呼び出し側は常に同じインスタンスを参照するため、状態の不整合を防ぐことができる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'リファクタリングは「外部から見た動作(仕様)を変えない」という点が核心であり、バグを直す<strong>デバッグ</strong>(振る舞いの誤りを修正する)、別の環境・基盤へ移行する<strong>マイグレーション</strong>、修正後に既存機能への影響を確認する<strong>リグレッションテスト</strong>とは目的も内容も異なる。選択肢にこれらが並んだときは「仕様(振る舞い)を変えているかどうか」で切り分けるとよい。またSingletonパターンは、単に「グローバル変数を使う」こととは異なり、インスタンス生成そのものを1つに制限し、生成の管理をクラス自身がカプセル化する点が特徴である。' }
      ]
    }
  ]
};
