import { GenreContent } from '../../models/genre-content.models';

export const KIHONJOHO_SYSTEM_DEVELOPMENT_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'system-development',
  genreName: 'システム開発技術',
  category: 'テクノロジ系',
  questionCount: 10,
  description: '要件定義から設計・実装・テストまでのシステム開発工程と、レビューや保守に関する代表的な技法を解説しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '開発工程(要件定義・外部設計・内部設計)',
      relatedExamples: '関連する出題例: 「利用者の要望を分析し機能・性能を明確にする工程は何か」「画面や帳票など利用者から見える仕様を設計する工程は何か」「プログラムの内部構造を詳細化する工程は何か」など',
      blocks: [
        { type: 'paragraph', html: 'システム開発は、上流工程から下流工程へと順に進む。まず利用者の業務内容や要望を分析して「何を作るか」を明確にし(要件定義)、その内容をもとに利用者から見える部分の仕様を決め(外部設計)、続いて開発者側の視点でプログラムの内部構造を詳細化する(内部設計)。工程が進むほど、対象は「利用者視点」から「開発者視点」へと移っていく。' },
        {
          type: 'table',
          headers: ['工程', '内容', '視点'],
          rows: [
            ['要件定義', '利用者の業務内容や要望を分析し、システムに求められる機能・性能を明確にする', '利用者'],
            ['外部設計(概要設計)', '画面レイアウトや帳票など、利用者から見えるインタフェースの仕様を設計する', '利用者'],
            ['内部設計(詳細設計)', 'プログラムの内部構造やモジュール分割など、開発者側の視点で仕様を詳細化する', '開発者'],
            ['プログラミング', '設計内容をもとにソースコードを作成する', '開発者']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 200" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="10" width="110" height="30" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="65" y="30" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">要件定義</text>
              <rect x="65" y="44" width="110" height="30" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="120" y="64" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">外部設計</text>
              <rect x="120" y="78" width="110" height="30" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="175" y="98" font-size="13" fill="#c9820a" text-anchor="middle" font-weight="bold">内部設計</text>
              <rect x="175" y="112" width="110" height="30" rx="6" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
              <text x="230" y="132" font-size="13" fill="#7c3aed" text-anchor="middle" font-weight="bold">プログラミング</text>
              <rect x="230" y="146" width="110" height="30" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="285" y="166" font-size="13" fill="#0f8fa8" text-anchor="middle" font-weight="bold">テスト</text>
              <line x1="65" y1="40" x2="120" y2="44" stroke="#7b8794" stroke-width="2"/>
              <line x1="120" y1="74" x2="175" y2="78" stroke="#7b8794" stroke-width="2"/>
              <line x1="175" y1="108" x2="230" y2="112" stroke="#7b8794" stroke-width="2"/>
              <line x1="230" y1="142" x2="285" y2="146" stroke="#7b8794" stroke-width="2"/>
            </svg>
          `,
          caption: 'ウォーターフォールモデル: 上流工程(要件定義)から下流工程(テスト)へ、後戻りしない前提で順番に進める開発モデル。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「外部設計」と「内部設計」は名前が似ていて混同しやすい。外部設計は<strong>利用者から見える</strong>画面・帳票などの仕様を決める工程、内部設計は<strong>開発者だけが意識する</strong>プログラム内部の構造(モジュール分割など)を決める工程である。「外に見えるか、中身だけの話か」で判断するとよい。' }
      ]
    },
    {
      title: 'テストの種類と実施順序',
      relatedExamples: '関連する出題例: 「モジュール間のインタフェースを検証するテストは何か」「システム全体が要件を満たすか検証するテストは何か」「発注者側が主体となって確認するテストは何か」「既存機能への悪影響を確認するテストは何か」など',
      blocks: [
        { type: 'paragraph', html: 'テストは、開発した部分が小さい順に「単体テスト→結合テスト→システムテスト→受入テスト」の順で段階的に範囲を広げながら行う。設計の各工程で決めた仕様に対応する形で、それぞれのテストの検証範囲が決まっている点がポイントである。' },
        {
          type: 'table',
          headers: ['テスト', '検証内容', '対応する設計工程', '主な実施者'],
          rows: [
            ['単体テスト', 'モジュール(プログラム)単体が仕様通りに動作するか', '内部設計', '開発者'],
            ['結合テスト', '複数モジュールを組み合わせ、モジュール間のインタフェースが正しく機能するか', '外部設計', '開発者'],
            ['システムテスト(総合テスト)', 'システム全体が要件定義で定めた機能・性能をすべて満たすか', '要件定義', '開発者(開発側)'],
            ['受入テスト(検収テスト)', '納品されたシステムが業務要件や契約内容を満たすか', '要件定義', '発注者(利用者側)']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 200" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="10" width="150" height="34" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="85" y="31" font-size="12" fill="#2f5fe0" text-anchor="middle" font-weight="bold">要件定義</text>
              <rect x="10" y="54" width="150" height="34" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="85" y="75" font-size="12" fill="#1f9d55" text-anchor="middle" font-weight="bold">外部設計</text>
              <rect x="10" y="98" width="150" height="34" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="85" y="119" font-size="12" fill="#c9820a" text-anchor="middle" font-weight="bold">内部設計</text>
              <rect x="10" y="142" width="150" height="34" rx="6" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
              <text x="85" y="163" font-size="12" fill="#7c3aed" text-anchor="middle" font-weight="bold">プログラミング</text>
              <rect x="280" y="10" width="150" height="34" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="355" y="31" font-size="12" fill="#0f8fa8" text-anchor="middle" font-weight="bold">受入テスト</text>
              <rect x="280" y="54" width="150" height="34" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="355" y="75" font-size="12" fill="#0f8fa8" text-anchor="middle" font-weight="bold">システムテスト</text>
              <rect x="280" y="98" width="150" height="34" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="355" y="119" font-size="12" fill="#0f8fa8" text-anchor="middle" font-weight="bold">結合テスト</text>
              <rect x="280" y="142" width="150" height="34" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="355" y="163" font-size="12" fill="#0f8fa8" text-anchor="middle" font-weight="bold">単体テスト</text>
              <line x1="160" y1="27" x2="280" y2="27" stroke="#7b8794" stroke-width="1.5" stroke-dasharray="4,3"/>
              <line x1="160" y1="71" x2="280" y2="71" stroke="#7b8794" stroke-width="1.5" stroke-dasharray="4,3"/>
              <line x1="160" y1="115" x2="280" y2="115" stroke="#7b8794" stroke-width="1.5" stroke-dasharray="4,3"/>
              <line x1="160" y1="159" x2="280" y2="159" stroke="#7b8794" stroke-width="1.5" stroke-dasharray="4,3"/>
            </svg>
          `,
          caption: 'V字モデル: 各設計工程で決めた仕様が、対応するテストの検証対象になる(要件定義⇔受入テスト、外部設計⇔システムテスト、内部設計⇔結合テスト、プログラミング⇔単体テスト)。'
        },
        { type: 'example', label: '例: 結合テストの検証イメージ', html: 'モジュールAとモジュールBをそれぞれ単体テストで検証した後、結合テストではAとBを実際に接続し、Aが渡すデータをBが正しく受け取れるかなど、<strong>モジュール間のインタフェース</strong>が仕様通りに機能するかを確認する。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '4種類のテストは「検証範囲の広さ」と「誰が行うか」で区別する。単体・結合・システムテストは<strong>開発者側</strong>が行うが、受入テストだけは<strong>発注者(利用者)側</strong>が主体となる点に注意。また回帰テスト(リグレッションテスト)は、プログラムを修正した際に既存の正常な機能へ悪影響(デグレード)が出ていないかを確認するテストで、上記4種類とは別の「修正のたびに行う」テストである。' }
      ]
    },
    {
      title: 'レビュー技法(ウォークスルー・インスペクション)',
      relatedExamples: '関連する出題例: 「開発者が説明しながら複数人でレビューを行い、誤りを早期発見する手法は何か」',
      blocks: [
        { type: 'paragraph', html: 'プログラムや設計書は、完成後にテストで誤りを見つけるより前に、複数人でレビューして早期に問題点を洗い出すことが望ましい。代表的なレビュー技法として、ウォークスルーとインスペクションがある。両者は「誰が進行するか」「どれだけ形式張っているか」で区別される。' },
        {
          type: 'table',
          headers: ['技法', '進行役', '特徴'],
          rows: [
            ['ウォークスルー', '作成者(開発者)自身', '作成者が説明役となり、参加者と一緒に内容をたどりながら検証する、比較的簡易なレビュー'],
            ['インスペクション', 'モデレーター(進行役)', '作成者以外の第三者が進行役となり、役割分担された参加者が形式に沿って検証する、公式で厳格なレビュー'],
            ['ペアプログラミング', '(レビューではなく開発スタイル)', '2人1組でコードを書きながら常時レビューし合う開発手法。完成物を後から見直す「レビュー技法」とは性質が異なる']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ウォークスルーとインスペクションは「開発者(作成者)自身が主導するか、第三者が主導するか」で覚えるとよい。ウォークスルーは<strong>作成者主導</strong>の比較的軽いレビュー、インスペクションは<strong>第三者(モデレーター)主導</strong>の公式なレビューである。' }
      ]
    },
    {
      title: '保守・解析技術(リファクタリング・リバースエンジニアリング)',
      relatedExamples: '関連する出題例: 「外部から見た動作を変えずに内部構造を整理し直すことを何と呼ぶか」「既存のプログラムを解析し設計内容を明らかにする手法は何か」',
      blocks: [
        { type: 'paragraph', html: '開発したシステムは、運用開始後も保守や改修が続く。ここでは、既存のプログラムに手を加えたり解析したりする代表的な技法を整理する。' },
        {
          type: 'table',
          headers: ['技法', '内容', '方向性'],
          rows: [
            ['リファクタリング', '外部から見た動作(仕様)を変えずに、内部構造を分かりやすく保守しやすい形に整理し直す', '同じプログラムを内部で作り直す'],
            ['リバースエンジニアリング', '既存のプログラムやシステムを解析し、明文化されていなかった設計内容や仕組みを明らかにする', '実装 → 設計(逆方向)'],
            ['フォワードエンジニアリング', '設計書などの上流工程の成果物をもとに、通常の順序でプログラムを開発する', '設計 → 実装(順方向)'],
            ['プロトタイピング', '開発の早い段階で試作品(プロトタイプ)を作り、利用者に確認してもらいながら仕様を固める', '要件定義・設計の補助']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'リファクタリングは「動作は変えずに中身だけ整理する」作業であり、バグ修正や機能追加(振る舞いの変更)とは異なる。またリバースエンジニアリングは実装物から設計情報を導き出す<strong>逆方向</strong>の解析、フォワードエンジニアリングは設計から実装へ進む<strong>通常の開発方向</strong>であり、矢印の向きで対比して覚えるとよい。' }
      ]
    }
  ]
};
