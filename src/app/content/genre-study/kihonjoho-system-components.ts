import { GenreContent } from '../../models/genre-content.models';

const CONFIG_ICON = (fill: string, stroke: string, textColor: string, label: string) => `
  <svg viewBox="0 0 100 60" width="100%" height="60">
    <rect x="10" y="10" width="60" height="40" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <text x="40" y="35" font-size="12" fill="${textColor}" text-anchor="middle" font-weight="bold">${label}</text>
  </svg>
`;

export const KIHONJOHO_SYSTEM_COMPONENTS_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'system-components',
  genreName: 'システム構成要素',
  category: 'テクノロジ系',
  description: 'クラスタリング・負荷分散・冗長化などシステムの可用性を高める構成や稼働率の計算、信頼性設計の考え方、クラウドサービスの分類など、システム構成要素で問われる要点を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: 'システムの処理能力向上:スケールアップとスケールアウト',
      blocks: [
        { type: 'paragraph', html: 'システムの処理能力(スループット)を高める方法は大きく2つに分けられる。1台あたりの性能を強化する方法と、台数を増やす方法である。' },
        {
          type: 'table',
          headers: ['方式', '別名', '内容', '特徴'],
          rows: [
            ['スケールアップ', '垂直拡張', 'サーバ自体のCPU・メモリなどのハードウェア性能を強化する', '構成台数は変わらず管理しやすいが、性能向上には上限がある'],
            ['スケールアウト', '水平拡張', 'サーバの台数を増やしてシステム全体の処理能力を高める', '理論上は台数に応じて性能を伸ばせるが、負荷分散の仕組みが別途必要になる']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 170" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="95" y="20" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">スケールアップ(垂直拡張)</text>
              <rect x="40" y="45" width="40" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="60" y="65" font-size="10" fill="#2f5fe0" text-anchor="middle">サーバ</text>
              <line x1="80" y1="60" x2="115" y2="60" stroke="#333" stroke-width="2"/>
              <rect x="115" y="30" width="70" height="60" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="150" y="64" font-size="11" fill="#2f5fe0" text-anchor="middle">高性能化</text>

              <text x="325" y="20" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">スケールアウト(水平拡張)</text>
              <rect x="230" y="45" width="45" height="30" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="252" y="65" font-size="10" fill="#1f9d55" text-anchor="middle">サーバ</text>
              <rect x="285" y="45" width="45" height="30" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="307" y="65" font-size="10" fill="#1f9d55" text-anchor="middle">サーバ</text>
              <rect x="340" y="45" width="45" height="30" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="362" y="65" font-size="10" fill="#1f9d55" text-anchor="middle">サーバ</text>
              <text x="305" y="90" font-size="11" fill="#333" text-anchor="middle">台数を増やす</text>
            </svg>
          `,
          caption: 'スケールアップは1台の性能そのものを強化し、スケールアウトは台数を増やして全体の処理能力を高める。'
        },
        { type: 'example', label: '例題: 台数を増やした場合の処理時間', html: '1台で実行すると60分かかる処理を、性能が同じコンピュータ3台で均等に分散して並列実行する(分散に伴うオーバーヘッドは無視する)。処理時間は台数に反比例するため、60分 ÷ 3台 = <strong>20分</strong>となる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「スケールアップ」と「スケールアウト」は名前が紛らわしい。性能を高く「アップ」させるのが1台の強化、規模を外へ「アウト(広げる)」のが台数増加、とイメージで区別するとよい。また実際には分散処理のオーバーヘッドがあるため、台数を増やしても必ずしも台数倍の性能向上にはならない点にも注意する。' }
      ]
    },
    {
      title: '可用性を高めるシステム構成と稼働率の計算',
      blocks: [
        { type: 'paragraph', html: 'システムの一部に障害が発生しても全体としてサービスを提供し続けられるようにする(可用性を高める)ため、複数の機器を組み合わせる構成が広く使われる。稼働率はシステムがどれだけ正常に稼働しているかを表す指標であり、装置の接続の仕方(直列か並列か)によって計算方法が異なる。' },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['クラスタリング', '同一の機能を持つ複数のコンピュータを連携させ、1台に障害が発生しても他のコンピュータが処理を引き継ぐことで可用性や処理性能を高める構成'],
            ['負荷分散(ロードバランシング)', '複数のサーバに処理要求を振り分けることで、特定のサーバへの負荷集中を防ぎ、システム全体の性能や可用性を高める技術'],
            ['フェイルオーバー', '稼働中のシステム(主系)に障害が発生した際、自動的に予備の系統(待機系)へ処理を引き継がせる仕組み']
          ]
        },
        { type: 'formula', label: '稼働率の基本式', html: '稼働率 = MTBF ÷ (MTBF + MTTR)<br>(MTBF: 平均故障間隔、MTTR: 平均修理時間)' },
        { type: 'formula', label: '直列システムの稼働率', html: '複数の装置を直列に接続した構成では、すべての装置が稼働していないとシステム全体は稼働しない。<br>稼働率 = A₁ × A₂ × …' },
        { type: 'formula', label: '並列システムの稼働率', html: '複数の装置を並列に接続した構成(クラスタリングなどの冗長構成に相当)では、少なくとも1台が稼働していればシステムは稼働する。<br>稼働率 = 1 - (1-A₁) × (1-A₂) × …' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 180" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="10" y="18" font-size="13" fill="#2f5fe0" font-weight="bold">直列システム</text>
              <line x1="10" y1="45" x2="50" y2="45" stroke="#333" stroke-width="2"/>
              <rect x="50" y="25" width="60" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="80" y="49" font-size="12" fill="#2f5fe0" text-anchor="middle">装置A</text>
              <line x1="110" y1="45" x2="150" y2="45" stroke="#333" stroke-width="2"/>
              <rect x="150" y="25" width="60" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="180" y="49" font-size="12" fill="#2f5fe0" text-anchor="middle">装置B</text>
              <line x1="210" y1="45" x2="240" y2="45" stroke="#333" stroke-width="2"/>
              <text x="330" y="49" font-size="11" fill="#333" text-anchor="middle">両方稼働で正常</text>

              <text x="10" y="105" font-size="13" fill="#1f9d55" font-weight="bold">並列システム(冗長構成)</text>
              <line x1="10" y1="145" x2="40" y2="120" stroke="#333" stroke-width="2"/>
              <line x1="10" y1="145" x2="40" y2="160" stroke="#333" stroke-width="2"/>
              <rect x="40" y="105" width="60" height="30" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="70" y="125" font-size="11" fill="#1f9d55" text-anchor="middle">装置A</text>
              <rect x="40" y="145" width="60" height="30" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="70" y="165" font-size="11" fill="#1f9d55" text-anchor="middle">装置B</text>
              <line x1="100" y1="120" x2="130" y2="145" stroke="#333" stroke-width="2"/>
              <line x1="100" y1="160" x2="130" y2="145" stroke="#333" stroke-width="2"/>
              <text x="320" y="149" font-size="11" fill="#333" text-anchor="middle">どちらか一方でも正常</text>
            </svg>
          `,
          caption: '直列構成はすべての装置が稼働している必要があり、並列(冗長)構成はどちらか一方が稼働していればシステムは稼働する。'
        },
        { type: 'example', label: '例題: 直列システムの稼働率', html: '稼働率0.9の装置Aと稼働率0.8の装置Bを直列に接続したシステムの稼働率は、0.9 × 0.8 = <strong>0.72</strong>となる。' },
        { type: 'example', label: '例題: 並列(冗長)システムの稼働率', html: '稼働率0.9の装置を2台並列に接続し、どちらか一方が稼働していればよい構成の稼働率は、1 - (1-0.9) × (1-0.9) = 1 - 0.1 × 0.1 = 1 - 0.01 = <strong>0.99</strong>となる。クラスタリングなどの冗長化によって可用性が高まることが数値からも確認できる。' },
        { type: 'example', label: '例題: 並列と直列を組み合わせた場合', html: '稼働率0.9の装置A・Bを並列に接続した部分(稼働率0.99、上の例題より)の後段に、稼働率0.95の装置Cを直列に接続する。システム全体の稼働率は、0.99 × 0.95 = <strong>0.9405</strong>となる。冗長化した部分と単一の部分が混在する構成では、それぞれの稼働率を求めたうえで最後に掛け合わせる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '直列と並列の式を混同しやすい。直列は「両方とも必要」なのでそのまま稼働率を掛け算する。並列は「どちらか一方でよい」ので、まず「両方とも故障している確率」(1-A₁)×(1-A₂)を求め、それを1から引く。並列(冗長)構成の稼働率は、必ず個々の装置単体の稼働率より高くなる。' }
      ]
    },
    {
      title: '信頼性設計の考え方(フェイルセーフ・フールプルーフ・フォールトトレランス)',
      blocks: [
        { type: 'paragraph', html: '障害や誤操作にどう備えるかを表す設計思想の用語は、名前が似ていて混同しやすい。「対象が装置の故障か、利用者の誤操作か」「障害時に安全に止めるのか、動かし続けるのか」という軸で整理するとよい。' },
        {
          type: 'table',
          headers: ['用語', '考え方', '具体例'],
          rows: [
            ['フェイルセーフ', '障害が発生した場合でも、被害を最小限に抑えられるよう、あらかじめ安全な状態に制御しておく', '信号機は故障すると全方向が赤(停止)になる'],
            ['フェイルソフト(縮退運転)', '障害が発生した場合、機能の一部を停止・制限してでもシステム全体の運転を継続する', '一部のエンジンが故障しても残りのエンジンで飛行を続ける航空機'],
            ['フォールトトレランス', 'システムの構成要素の一部に障害が発生しても、全体としては正常な処理を継続できるようにする(多重化などで実現)', '装置を二重化したシステム'],
            ['フールプルーフ', '利用者が誤った操作をしても、システムに重大な影響が及ばないように設計しておく', 'ふたを閉めないと動作しない電子レンジ']
          ]
        },
        {
          type: 'iconGrid',
          items: [
            { svg: CONFIG_ICON('#fdeaea', '#d64545', '#d64545', 'Safe'), label: 'フェイルセーフ', desc: '安全側に停止させる' },
            { svg: CONFIG_ICON('#fff4e5', '#c9820a', '#c9820a', 'Soft'), label: 'フェイルソフト', desc: '機能を縮小し継続' },
            { svg: CONFIG_ICON('#eafaf0', '#1f9d55', '#1f9d55', 'FT'), label: 'フォールトトレランス', desc: '多重化で継続稼働' },
            { svg: CONFIG_ICON('#eef2ff', '#2f5fe0', '#2f5fe0', 'Proof'), label: 'フールプルーフ', desc: '誤操作を無害化' }
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'フェイルセーフは「障害時に安全に止める」考え方であるのに対し、フェイルソフトやフォールトトレランスは「障害があっても動かし続ける」考え方であり、方向性が逆である点に注意する。また、フールプルーフだけは対象が「利用者の誤操作」であり、他の3つ(装置の故障が対象)とは前提が異なる。' }
      ]
    },
    {
      title: 'システムの運用形態(データセンタ・シンクライアント)',
      blocks: [
        { type: 'paragraph', html: '情報システムでは、機器をどこに設置するか、また端末側にどこまでの機能を持たせるかという観点でも構成が工夫される。' },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['データセンタ', 'サーバやネットワーク機器などを一か所に集約し、電源・空調・セキュリティなどの設備を整えて集中管理する施設'],
            ['シンクライアントシステム', 'クライアント端末には必要最小限の機能(画面表示・入力受付など)のみを持たせ、データ処理やアプリケーションの実行はサーバ側に集約するシステム構成']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 140" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="20" y="45" width="90" height="50" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="65" y="65" font-size="11" fill="#333" text-anchor="middle">クライアント</text>
              <text x="65" y="80" font-size="9" fill="#333" text-anchor="middle">(画面表示・入力のみ)</text>
              <line x1="110" y1="70" x2="220" y2="70" stroke="#333" stroke-width="2"/>
              <text x="165" y="62" font-size="9" fill="#7b8794" text-anchor="middle">ネットワーク</text>
              <rect x="220" y="30" width="160" height="80" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="300" y="65" font-size="12" fill="#2f5fe0" text-anchor="middle" font-weight="bold">サーバ</text>
              <text x="300" y="85" font-size="10" fill="#2f5fe0" text-anchor="middle">データ処理・アプリ実行</text>
            </svg>
          `,
          caption: 'シンクライアントシステムでは、端末側の機能を最小限にし、実際の処理はサーバ側に集約する。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'シンクライアントは単なる「機能の少ない軽量端末」ではなく、データをサーバ側に集約することで情報漏えい対策や運用管理の一元化に有効という点とセットで問われることが多い。' }
      ]
    },
    {
      title: 'クラウドサービスの提供形態(SaaS・PaaS・IaaS)',
      blocks: [
        { type: 'paragraph', html: 'クラウドサービスは、提供者がどこまでの範囲を用意し、利用者がどこから先を用意するかによって、主に3つの形態に分類される。' },
        {
          type: 'table',
          headers: ['分類', '正式名称', '提供される範囲', '具体例'],
          rows: [
            ['SaaS', 'Software as a Service', 'ソフトウェアの機能そのもの', 'Webメール、オンラインオフィスソフト'],
            ['PaaS', 'Platform as a Service', 'アプリケーションの実行環境(OS・ミドルウェアなど)', 'アプリケーションの開発・実行基盤'],
            ['IaaS', 'Infrastructure as a Service', 'サーバ・ストレージ・ネットワークなどのインフラ基盤', '仮想サーバ、クラウドストレージ']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 210" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="60" y="15" font-size="12" fill="#333" text-anchor="middle" font-weight="bold">IaaS</text>
              <rect x="20" y="120" width="80" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="60" y="140" font-size="9" fill="#2f5fe0" text-anchor="middle">ハードウェア</text>
              <rect x="20" y="90" width="80" height="30" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/><text x="60" y="110" font-size="9" fill="#333" text-anchor="middle">OS/M-W</text>
              <rect x="20" y="60" width="80" height="30" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/><text x="60" y="80" font-size="9" fill="#333" text-anchor="middle">アプリ</text>

              <text x="210" y="15" font-size="12" fill="#333" text-anchor="middle" font-weight="bold">PaaS</text>
              <rect x="170" y="120" width="80" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="210" y="140" font-size="9" fill="#2f5fe0" text-anchor="middle">ハードウェア</text>
              <rect x="170" y="90" width="80" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="210" y="110" font-size="9" fill="#2f5fe0" text-anchor="middle">OS/M-W</text>
              <rect x="170" y="60" width="80" height="30" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/><text x="210" y="80" font-size="9" fill="#333" text-anchor="middle">アプリ</text>

              <text x="360" y="15" font-size="12" fill="#333" text-anchor="middle" font-weight="bold">SaaS</text>
              <rect x="320" y="120" width="80" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="360" y="140" font-size="9" fill="#2f5fe0" text-anchor="middle">ハードウェア</text>
              <rect x="320" y="90" width="80" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="360" y="110" font-size="9" fill="#2f5fe0" text-anchor="middle">OS/M-W</text>
              <rect x="320" y="60" width="80" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="360" y="80" font-size="9" fill="#2f5fe0" text-anchor="middle">アプリ</text>

              <text x="210" y="190" font-size="10" fill="#7b8794" text-anchor="middle">青色の層 = 提供者側が管理する範囲</text>
            </svg>
          `,
          caption: 'IaaS→PaaS→SaaSの順に、提供者が管理する範囲(青色部分)が広がり、利用者が自分で用意する範囲は狭くなる。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'IaaSは基盤(ハードウェア相当)まで、PaaSは実行環境(OS・ミドルウェア)まで、SaaSはソフトウェアそのものまでを提供する、というように「提供者が管理する範囲の広さ」で整理すると区別しやすい。IaaS→PaaS→SaaSの順に、利用者が自分で構築・管理すべき範囲は狭くなっていく。' }
      ]
    }
  ]
};
