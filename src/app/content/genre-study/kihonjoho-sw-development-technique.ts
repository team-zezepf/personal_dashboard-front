import { GenreContent } from '../../models/genre-content.models';

export const KIHONJOHO_SW_DEVELOPMENT_TECHNIQUE_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'sw-development-technique',
  genreName: 'ソフトウェア開発技術',
  category: 'テクノロジ系',
  description: 'オブジェクト指向・開発モデル・状態遷移図・テスト技法など、ソフトウェア開発技術で問われる要点を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: 'オブジェクト指向プログラミングの三大要素',
      relatedExamples: '関連する出題例: 「オブジェクト指向プログラミングの特徴として適切なものを、すべて選べ」など',
      blocks: [
        { type: 'paragraph', html: 'オブジェクト指向とは、データ(属性)とそれを操作する処理(メソッド)をひとつの「オブジェクト」としてまとめて扱う考え方である。代表的な特徴として「カプセル化」「継承」「ポリモーフィズム(多態性)」の3つが挙げられる。' },
        {
          type: 'table',
          headers: ['要素', '説明'],
          rows: [
            ['カプセル化', 'データと処理をひとつにまとめ、外部から内部構造を隠蔽すること。不用意な書き換えを防げる。'],
            ['継承', '既存クラス(親クラス)の属性・メソッドを引き継いで、新しいクラス(子クラス)を定義すること。'],
            ['ポリモーフィズム(多態性)', '同じメソッド呼び出しでも、オブジェクトの種類ごとに異なる処理を実行できること。']
          ]
        },
        { type: 'example', label: '例: 「乗り物」クラスと「車」「自転車」クラス', html: '「車」「自転車」はいずれも「乗り物」クラスを<strong>継承</strong>して固有の属性を追加できる(継承)。それぞれ内部の実装は隠して「動く」という操作だけを外部に公開できる(カプセル化)。同じ「動く」という呼び出しでも、車と自転車で実際の動作は異なってよい(ポリモーフィズム)。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「オブジェクト指向は逐次処理のみをサポートする」という選択肢は誤り。オブジェクト指向はデータと処理をオブジェクトとしてまとめる設計上の考え方であり、条件分岐・繰り返しなど処理の流れ自体を制限するものではない。' }
      ]
    },
    {
      title: '開発モデル(ウォーターフォールとアジャイル)',
      relatedExamples: '関連する出題例: 「要件定義・設計・開発・テストの各工程を上流から下流へ順番に一度だけ実施し、原則として後戻りを想定しない開発モデルはどれか」「短い開発サイクルを繰り返しながら、顧客の要望の変化に柔軟に対応していく開発手法を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'ソフトウェア開発の進め方(開発モデル)には、工程を順番に一度だけ進めるウォーターフォールモデルと、短い期間で開発を繰り返すアジャイル開発が代表的である。両者は工程の進み方が対照的なので、図の形で違いを覚えるとよい。' },
        {
          type: 'table',
          headers: ['モデル', '特徴', '後戻り'],
          rows: [
            ['ウォーターフォールモデル', '要件定義→設計→開発→テストの順に、工程を上流から下流へ一度だけ進める', '原則想定しない'],
            ['アジャイル開発', '短いサイクル(イテレーション)で計画・設計・実装・テストを繰り返す', '各サイクルで柔軟に見直す'],
            ['スパイラルモデル', 'サブシステムごとに設計・開発・評価を繰り返しながら段階的に完成させる', '繰り返しの中で見直す'],
            ['プロトタイピングモデル', '試作品(プロトタイプ)を早期に作り、利用者の確認を得ながら開発を進める', '試作評価の都度見直す']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 190" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="90" y="16" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">ウォーターフォール</text>
              <rect x="20" y="26" width="140" height="26" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/>
              <text x="90" y="43" font-size="11" fill="#2f5fe0" text-anchor="middle">要件定義</text>
              <line x1="90" y1="52" x2="90" y2="66" stroke="#2f5fe0" stroke-width="2"/>
              <rect x="20" y="66" width="140" height="26" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/>
              <text x="90" y="83" font-size="11" fill="#2f5fe0" text-anchor="middle">設計</text>
              <line x1="90" y1="92" x2="90" y2="106" stroke="#2f5fe0" stroke-width="2"/>
              <rect x="20" y="106" width="140" height="26" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/>
              <text x="90" y="123" font-size="11" fill="#2f5fe0" text-anchor="middle">開発</text>
              <line x1="90" y1="132" x2="90" y2="146" stroke="#2f5fe0" stroke-width="2"/>
              <rect x="20" y="146" width="140" height="26" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/>
              <text x="90" y="163" font-size="11" fill="#2f5fe0" text-anchor="middle">テスト</text>

              <text x="320" y="16" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">アジャイル</text>
              <circle cx="320" cy="105" r="70" fill="#eafaf0" stroke="#1f9d55" stroke-width="1.5"/>
              <rect x="290" y="45" width="60" height="24" rx="4" fill="#ffffff" stroke="#1f9d55" stroke-width="1.5"/>
              <text x="320" y="61" font-size="10" fill="#1f9d55" text-anchor="middle">計画</text>
              <rect x="345" y="90" width="60" height="24" rx="4" fill="#ffffff" stroke="#1f9d55" stroke-width="1.5"/>
              <text x="375" y="106" font-size="10" fill="#1f9d55" text-anchor="middle">実装</text>
              <rect x="290" y="135" width="60" height="24" rx="4" fill="#ffffff" stroke="#1f9d55" stroke-width="1.5"/>
              <text x="320" y="151" font-size="10" fill="#1f9d55" text-anchor="middle">テスト</text>
              <rect x="235" y="90" width="60" height="24" rx="4" fill="#ffffff" stroke="#1f9d55" stroke-width="1.5"/>
              <text x="265" y="106" font-size="10" fill="#1f9d55" text-anchor="middle">評価</text>
            </svg>
          `,
          caption: 'ウォーターフォールは一方向に工程を進めるのに対し、アジャイルは短いサイクルを反復しながら進める。'
        }
      ]
    },
    {
      title: '状態遷移図',
      relatedExamples: '関連する出題例: 「状態遷移図において、ある状態でイベントEが発生した場合に遷移する状態はどれか」',
      blocks: [
        { type: 'paragraph', html: '状態遷移図は、システムやオブジェクトが取り得る「状態」を楕円(または丸角の箱)で表し、状態を変化させる「イベント」を矢印とラベルで表した図である。ある状態からイベントが発生したとき、そのイベントの矢印をたどった先が遷移後の状態になる。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 130" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <defs>
                <marker id="stArrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L6,3 z" fill="#333"/>
                </marker>
              </defs>
              <ellipse cx="80" cy="65" rx="60" ry="36" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="80" y="70" font-size="14" fill="#2f5fe0" text-anchor="middle">状態A</text>
              <line x1="142" y1="65" x2="230" y2="65" stroke="#333" stroke-width="2" marker-end="url(#stArrow)"/>
              <text x="186" y="55" font-size="12" fill="#d64545" text-anchor="middle">イベントE</text>
              <ellipse cx="310" cy="65" rx="60" ry="36" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="310" y="70" font-size="14" fill="#2f5fe0" text-anchor="middle">状態B</text>
            </svg>
          `,
          caption: '「状態A」でイベントEが発生すると、Eの矢印が指す先である「状態B」に遷移する。矢印のないイベントでは状態は変化しない。'
        },
        { type: 'example', label: '読み取り方のコツ', html: '出題では「ある状態」から「あるイベント」が発生したときの遷移先を問われることが多い。まず問題文の状態を図中から探し、そこから出ている矢印のうち該当イベントのラベルを持つものをたどればよい。' }
      ]
    },
    {
      title: 'テスト技法(単体テストとブラックボックステスト)',
      relatedExamples: '関連する出題例: 「プログラムを構成する個々のモジュール(関数・クラスなど)が単独で正しく動作するかを検証するテストを何と呼ぶか」「プログラムの内部構造を考慮せず、入力に対する出力が仕様通りであるかに着目してテストを行う手法を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'ソフトウェアのテストは、対象範囲の広さによる「テストレベル」と、内部構造を見るかどうかによる「テスト技法」の2つの観点で分類できる。' },
        {
          type: 'table',
          headers: ['テストレベル', '内容'],
          rows: [
            ['単体テスト', 'モジュール(関数・クラスなど)単位で、単独で正しく動作するかを検証する'],
            ['結合テスト', '複数のモジュールを組み合わせ、モジュール間の連携が正しく動作するかを検証する'],
            ['システムテスト', 'システム全体として要求仕様どおりに動作するかを検証する'],
            ['運用テスト', '実際の運用環境に近い条件で、業務上問題なく利用できるかを検証する']
          ]
        },
        {
          type: 'table',
          headers: ['テスト技法', '内容'],
          rows: [
            ['ホワイトボックステスト', 'プログラムの内部構造(制御の流れなど)に着目し、意図どおりに処理が実行されるかを検証する'],
            ['ブラックボックステスト', '内部構造は考慮せず、入力に対する出力が仕様どおりであるかに着目して検証する']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「単体テスト」と「結合テスト」を混同しやすい。単体テストはモジュール1つを個別に確認するテスト、結合テストは複数モジュールを組み合わせた連携を確認するテストである。' }
      ]
    }
  ]
};
