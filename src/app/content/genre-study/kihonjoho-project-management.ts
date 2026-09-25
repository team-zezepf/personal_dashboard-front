import { GenreContent } from '../../models/genre-content.models';

const LABEL_ICON = (fill: string, stroke: string, textColor: string, label: string) => `
  <svg viewBox="0 0 100 60" width="100%" height="60">
    <rect x="6" y="10" width="88" height="40" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <text x="50" y="35" font-size="12" fill="${textColor}" text-anchor="middle" font-weight="bold">${label}</text>
  </svg>
`;

export const KIHONJOHO_PROJECT_MANAGEMENT_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'project-management',
  genreName: 'プロジェクトマネジメント',
  category: 'マネジメント系',
  description: 'WBS・ガントチャート・PERT図といった代表的な図法や、コスト管理(EVM)・リスク対応など、プロジェクトマネジメントで問われる要点を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: 'プロジェクトの立ち上げとスコープ定義',
      blocks: [
        { type: 'paragraph', html: 'プロジェクトとは、独自の成果物やサービスを生み出すために期間を定めて行われる一連の活動である。プロジェクトマネジメントでは、品質・コスト・スケジュール(納期)などを計画的に管理し、目的を達成することが求められる。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <line x1="150" y1="34" x2="70" y2="160" stroke="#333" stroke-width="1.5"/>
              <line x1="250" y1="34" x2="330" y2="160" stroke="#333" stroke-width="1.5"/>
              <line x1="110" y1="177" x2="290" y2="177" stroke="#333" stroke-width="1.5"/>

              <rect x="150" y="0" width="100" height="34" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="200" y="22" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">品質(Q)</text>

              <rect x="10" y="160" width="100" height="34" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="60" y="182" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">コスト(C)</text>

              <rect x="290" y="160" width="100" height="34" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="340" y="182" font-size="13" fill="#c9820a" text-anchor="middle" font-weight="bold">納期(D)</text>

              <text x="200" y="110" font-size="11" fill="#7b8794" text-anchor="middle">互いにトレードオフ</text>
            </svg>
          `,
          caption: 'QCD(Quality・Cost・Delivery)は、プロジェクトマネジメントの代表的な制約条件である。3要素は互いにトレードオフの関係にあり、例えば納期を短縮しようとすると、コストが増加したり品質が低下したりしやすい。'
        },
        { type: 'paragraph', html: 'プロジェクトの立ち上げに際しては、まず「プロジェクト憲章」によってプロジェクトの目的・目標・責任者(プロジェクトマネージャ)などを正式に承認し、プロジェクトの存在を公式に認可する。続いて、プロジェクトの影響を受ける・与える人物や組織である「ステークホルダー」を特定し、実施する作業の範囲(スコープ)と、実施しない作業の境界を明確にする「スコープ定義」を行う。' },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['プロジェクト憲章', 'プロジェクトの目的・目標・責任者などを記載し、プロジェクトの存在を正式に認可・承認する文書'],
            ['ステークホルダー', 'プロジェクトの実施によって利害の影響を受ける、または与える個人・組織(顧客・利用者・メンバー・経営者など)'],
            ['スコープ定義', 'プロジェクトで実施する作業の範囲を明確にし、何を行い何を行わないかの境界を定めること']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'プロジェクト憲章は、プロジェクトの実施を正式に認可する文書であり、詳細な作業内容やスケジュールをまとめる「プロジェクト計画書」とは役割が異なる。また、QCDは3要素のどれか一つだけを追求すればよいものではなく、常にバランスを考えながら管理する必要がある点に注意する。' }
      ]
    },
    {
      title: 'WBSとスケジュール管理の基礎',
      blocks: [
        { type: 'paragraph', html: 'WBS(Work Breakdown Structure、作業分解構成図)は、プロジェクトで実施する作業を階層的に細分化し、管理しやすい単位(ワークパッケージ)まで分解して一覧化したものである。WBSによって作業の抜け漏れを防ぎ、担当者の割り当てや工数見積りの基礎となる単位を明確にできる。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 170" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="100" y="0" width="140" height="34" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="170" y="22" font-size="12" fill="#2f5fe0" text-anchor="middle" font-weight="bold">システム開発</text>

              <line x1="170" y1="34" x2="45" y2="80" stroke="#333" stroke-width="1.5"/>
              <line x1="170" y1="34" x2="155" y2="80" stroke="#333" stroke-width="1.5"/>
              <line x1="170" y1="34" x2="265" y2="80" stroke="#333" stroke-width="1.5"/>
              <line x1="170" y1="34" x2="375" y2="80" stroke="#333" stroke-width="1.5"/>

              <rect x="0" y="80" width="90" height="34" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="45" y="102" font-size="11" fill="#1f9d55" text-anchor="middle" font-weight="bold">要件定義</text>

              <rect x="110" y="80" width="90" height="34" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="155" y="102" font-size="11" fill="#1f9d55" text-anchor="middle" font-weight="bold">設計</text>

              <rect x="220" y="80" width="90" height="34" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="265" y="102" font-size="11" fill="#1f9d55" text-anchor="middle" font-weight="bold">製造</text>

              <rect x="330" y="80" width="90" height="34" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="375" y="102" font-size="11" fill="#1f9d55" text-anchor="middle" font-weight="bold">テスト</text>

              <line x1="155" y1="114" x2="125" y2="130" stroke="#333" stroke-width="1.5"/>
              <line x1="155" y1="114" x2="205" y2="130" stroke="#333" stroke-width="1.5"/>

              <rect x="90" y="130" width="70" height="30" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="125" y="149" font-size="10" fill="#333" text-anchor="middle">外部設計</text>

              <rect x="170" y="130" width="70" height="30" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="205" y="149" font-size="10" fill="#333" text-anchor="middle">内部設計</text>
            </svg>
          `,
          caption: 'WBS: プロジェクト全体を「システム開発」→「要件定義・設計・製造・テスト」→「外部設計・内部設計」のように階層的に細分化し、管理可能な単位まで分解する。'
        },
        { type: 'paragraph', html: 'WBSで作業を洗い出した後、各作業の開始日・終了日・所要期間・依存関係を横棒(バー)で視覚的に表した図が「ガントチャート」である。縦軸に作業項目、横軸に時間をとり、進捗状況の把握やスケジュール管理に用いられる。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="0" y="35" font-size="10" fill="#333">要件定義</text>
              <rect x="90" y="20" width="60" height="20" rx="3" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>

              <text x="0" y="70" font-size="10" fill="#333">設計</text>
              <rect x="150" y="55" width="70" height="20" rx="3" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>

              <text x="0" y="105" font-size="10" fill="#333">製造</text>
              <rect x="220" y="90" width="100" height="20" rx="3" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>

              <text x="0" y="140" font-size="10" fill="#333">テスト</text>
              <rect x="320" y="125" width="60" height="20" rx="3" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>

              <line x1="90" y1="146" x2="420" y2="146" stroke="#c7cdd6" stroke-width="1"/>
            </svg>
          `,
          caption: 'ガントチャート: 各作業を横棒で表し、開始・終了のタイミングや作業間の重なりを一目で把握できる。工程の完了時点などの重要な区切りは「マイルストーン」として、ガントチャート上に◇などの記号で示されることが多い。'
        },
        {
          type: 'table',
          headers: ['用語', '表現形式', '目的'],
          rows: [
            ['WBS', '作業項目を階層的に列挙した一覧・階層図', '作業の洗い出しと分解、担当・見積り単位の明確化'],
            ['ガントチャート', '横棒(バー)で開始・終了・期間を表す図', '日程・進捗の視覚的な管理'],
            ['マイルストーン', '特定の時点を示す標識(◇など)', '重要な区切り(工程完了など)の明示']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'WBSは「作業の範囲を階層的に分解した一覧」であり、日程そのものを表すものではない。日程や依存関係を横棒で示すのはガントチャート、作業の順序関係や重要経路を矢印(アロー)で示すのはPERT図であり、それぞれの表現形式と目的を混同しないよう注意する。' }
      ]
    },
    {
      title: 'PERT図とクリティカルパス',
      blocks: [
        { type: 'paragraph', html: 'PERT図(アローダイアグラム)は、作業の順序関係・依存関係を矢印(アロー)とノード(丸)で表現した図である。作業を並行して進められる部分と、順番に進めなければならない部分が視覚的にわかり、プロジェクト全体の所要日数や重要な経路を分析できる。' },
        { type: 'example', label: '例題: 経路の所要日数の求め方', html: 'A作業(3日)の後にB作業(5日)、B作業の後にC作業(2日)が続く経路の所要日数は、各作業の所要日数を合計して求める。3日+5日+2日=<strong>10日</strong>である。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 180" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <circle cx="20" cy="90" r="16" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="20" y="94" font-size="10" fill="#333" text-anchor="middle">開始</text>

              <circle cx="170" cy="40" r="16" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="170" y="44" font-size="10" fill="#333" text-anchor="middle">①</text>

              <circle cx="170" cy="140" r="16" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="170" y="144" font-size="10" fill="#333" text-anchor="middle">②</text>

              <circle cx="300" cy="140" r="16" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="300" y="144" font-size="10" fill="#333" text-anchor="middle">③</text>

              <circle cx="420" cy="90" r="16" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="420" y="94" font-size="10" fill="#333" text-anchor="middle">終了</text>

              <line x1="34" y1="82" x2="156" y2="48" stroke="#7b8794" stroke-width="2"/>
              <text x="90" y="55" font-size="11" fill="#7b8794" text-anchor="middle">A=4日</text>
              <line x1="184" y1="40" x2="406" y2="82" stroke="#7b8794" stroke-width="2"/>
              <text x="300" y="55" font-size="11" fill="#7b8794" text-anchor="middle">B=6日</text>

              <line x1="30" y1="98" x2="156" y2="134" stroke="#d64545" stroke-width="3"/>
              <text x="90" y="130" font-size="11" fill="#d64545" text-anchor="middle" font-weight="bold">C=3日</text>
              <line x1="186" y1="140" x2="284" y2="140" stroke="#d64545" stroke-width="3"/>
              <text x="235" y="132" font-size="11" fill="#d64545" text-anchor="middle" font-weight="bold">D=5日</text>
              <line x1="316" y1="136" x2="408" y2="98" stroke="#d64545" stroke-width="3"/>
              <text x="370" y="130" font-size="11" fill="#d64545" text-anchor="middle" font-weight="bold">E=4日</text>
            </svg>
          `,
          caption: '経路①(開始→①→終了)は4+6=10日、経路②(開始→②→③→終了、赤色)は3+5+4=12日。所要日数が最も長い経路②がクリティカルパスとなり、プロジェクト全体の最短完了日数は12日となる。経路①に多少の遅れが生じても全体の完了日には影響しないが、クリティカルパス上の作業が1日でも遅れると、プロジェクト全体の完了が遅れる。'
        },
        { type: 'example', label: '例題: クリティカルパスの決定', html: 'ある2つの経路の所要日数が、経路A=12日、経路B=15日である場合、プロジェクト全体の所要日数は、複数の経路のうち最も日数の長い経路(クリティカルパス)によって決まる。したがって、経路Bの<strong>15日</strong>がこのプロジェクト全体の最短完了日数となる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'クリティカルパスは「複数経路のうち最も日数が長い経路」であり、最も短い経路ではない点を取り違えないよう注意する。クリティカルパス以外の経路には多少の余裕(フロート)があっても、クリティカルパス上の作業の遅延は必ずプロジェクト全体の遅延に直結する。' }
      ]
    },
    {
      title: '工数・スケジュールの見積り技法',
      blocks: [
        { type: 'paragraph', html: 'プロジェクトの工数や期間を見積もる際には、いくつかの代表的な手法が用いられる。見積りの根拠が「過去の実績」なのか「数式(パラメータ)」なのか「複数値からの期待値」なのかによって手法が異なる。' },
        {
          type: 'table',
          headers: ['見積り技法', '概要'],
          rows: [
            ['類推見積り(アナロジー見積り)', '過去に実施した類似プロジェクトの実績データを参考にして見積もる'],
            ['パラメトリック見積り', '過去の実績データから導いた数式や係数(パラメータ)を用いて、規模などから工数・コストを算出する'],
            ['三点見積り(PERT見積り)', '楽観値・最頻値・悲観値の3つの値から、重み付き平均によって期待値を算出する'],
            ['デルファイ法', '複数の専門家に匿名でアンケートを繰り返し実施し、意見を収束させて見積もる']
          ]
        },
        { type: 'formula', label: '三点見積り(PERT見積り)の期待値', html: '期待値 = (楽観値 + 4 × 最頻値 + 悲観値) ÷ 6' },
        { type: 'example', label: '例題: 三点見積りによる期待値の算出', html: 'ある作業の楽観値が4日、最頻値が6日、悲観値が14日であるとき、期待値は次の式で求める。(4 + 4×6 + 14) ÷ 6 = (4 + 24 + 14) ÷ 6 = 42 ÷ 6 = <strong>7日</strong>' },
        { type: 'example', label: '例題: 工数から所要時間を求める', html: 'ある作業の見積り工数が160人時であり、4人のチームで均等に分担して作業する場合(1人当たりの生産性は同一とする)、必要な作業時間は 160人時 ÷ 4人 = <strong>40時間</strong>となる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'パラメトリック見積りは「過去データから導いた数式(パラメータ)」を使う点で、類似プロジェクトの実績値をそのまま当てはめる類推見積りとは異なる。また、三点見積りの期待値は単純平均((楽観値+最頻値+悲観値)÷3)ではなく、最頻値を4倍して重み付けした上で6で割る点に注意する。' }
      ]
    },
    {
      title: 'コストマネジメントとアーンドバリューマネジメント(EVM)',
      blocks: [
        { type: 'paragraph', html: 'アーンドバリューマネジメント(EVM)は、計画値・出来高・実コストという3つの指標を用いて、プロジェクトのコストやスケジュールの効率を定量的に評価する手法である。' },
        {
          type: 'table',
          headers: ['指標', '英語', '意味'],
          rows: [
            ['PV(計画価値)', 'Planned Value', 'ある時点までに完了しているはずだった作業の、計画時点での価値(予算)'],
            ['EV(出来高・達成価値)', 'Earned Value', 'ある時点までに実際に完了した作業の、計画時点での価値に換算した値'],
            ['AC(実コスト)', 'Actual Cost', 'ある時点までに実際に投入したコスト']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <line x1="20" y1="10" x2="20" y2="180" stroke="#333" stroke-width="1.5"/>
              <line x1="20" y1="180" x2="410" y2="180" stroke="#333" stroke-width="1.5"/>
              <text x="10" y="10" font-size="9" fill="#7b8794">累積金額</text>
              <text x="390" y="196" font-size="9" fill="#7b8794">時間</text>

              <polyline points="20,170 120,135 220,95 320,55 400,20" fill="none" stroke="#2f5fe0" stroke-width="2.5" stroke-dasharray="5,3"/>
              <text x="330" y="15" font-size="10" fill="#2f5fe0" font-weight="bold">PV(計画値)</text>

              <polyline points="20,170 120,148 220,125 320,105 400,88" fill="none" stroke="#1f9d55" stroke-width="2.5"/>
              <text x="330" y="105" font-size="10" fill="#1f9d55" font-weight="bold">EV(出来高)</text>

              <polyline points="20,170 120,125 220,105 320,72 400,50" fill="none" stroke="#d64545" stroke-width="2.5"/>
              <text x="330" y="60" font-size="10" fill="#d64545" font-weight="bold">AC(実コスト)</text>
            </svg>
          `,
          caption: 'PV(計画値)を基準に、EV(出来高)がPVを下回っていればスケジュールが遅れている状態、AC(実コスト)がEVを上回っていればコストが超過している状態を示す。この図では出来高が計画を下回り、かつ実コストが出来高を上回っているため、「遅延」と「コスト超過」の両方が起きていることが読み取れる。'
        },
        { type: 'formula', label: 'コスト効率・スケジュール効率の指標', html: 'CPI(コスト効率指数) = EV ÷ AC<br>SPI(スケジュール効率指数) = EV ÷ PV<br>(いずれも1より大きければ効率が良く、1より小さければ非効率であることを示す)' },
        { type: 'example', label: '例題: CPI・SPIの算出', html: 'ある時点でPV=100万円、EV=80万円、AC=100万円であったとする。SPI = 80 ÷ 100 = 0.8、CPI = 80 ÷ 100 = 0.8となり、<strong>いずれも1を下回るため、計画より進捗が遅れており、かつコストも超過している</strong>と判断できる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'SPI(EV÷PV)は「スケジュール(進捗)」の効率を、CPI(EV÷AC)は「コスト」の効率を表す指標であり、分母がPVかACかを取り違えやすい。どちらも計算結果が1より大きければ計画より順調(進んでいる・予算内)、1より小さければ非効率(遅延・超過)であると覚えておく。' }
      ]
    },
    {
      title: '品質マネジメントとリスクマネジメント',
      blocks: [
        { type: 'paragraph', html: '品質マネジメントは、プロジェクトの成果物やそれを生み出すプロセスが、求められる品質基準を満たすことを目的とする活動である。代表的な概念として、品質保証(QA)と品質管理(QC)がある。' },
        {
          type: 'table',
          headers: ['用語', '着目する対象', '目的'],
          rows: [
            ['品質保証(QA: Quality Assurance)', 'プロセス全体', '定められたプロセスが適切に実行されているかに着目し、成果物が品質基準を満たすことを保証する'],
            ['品質管理(QC: Quality Control)', '個々の成果物', '個々の成果物を検査し、欠陥を検出・除去する']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント(品質)', html: '品質保証(QA)は「プロセス」に着目するのに対し、品質管理(QC)は「個々の成果物の検査・欠陥検出」に着目する点で視点が異なる。QAとQCの略語と役割を逆に覚えないよう注意する。' },
        { type: 'paragraph', html: 'リスクマネジメントは、プロジェクトの遂行を妨げる可能性のある事象(リスク)をあらかじめ特定・分析し、対応策を計画するプロセスである。特定したリスクへの対応戦略には、主に次の4種類がある。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="70" y="20" width="160" height="80" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="150" y="60" font-size="13" fill="#c9820a" text-anchor="middle" font-weight="bold">軽減</text>
              <text x="150" y="78" font-size="9" fill="#c9820a" text-anchor="middle">高確率・低影響</text>

              <rect x="230" y="20" width="160" height="80" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="310" y="60" font-size="13" fill="#d64545" text-anchor="middle" font-weight="bold">回避</text>
              <text x="310" y="78" font-size="9" fill="#d64545" text-anchor="middle">高確率・高影響</text>

              <rect x="70" y="100" width="160" height="80" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="150" y="140" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">受容</text>
              <text x="150" y="158" font-size="9" fill="#1f9d55" text-anchor="middle">低確率・低影響</text>

              <rect x="230" y="100" width="160" height="80" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="310" y="140" font-size="13" fill="#0f8fa8" text-anchor="middle" font-weight="bold">転嫁</text>
              <text x="310" y="158" font-size="9" fill="#0f8fa8" text-anchor="middle">低確率・高影響</text>

              <line x1="60" y1="190" x2="60" y2="15" stroke="#333" stroke-width="1.5"/>
              <text x="35" y="30" font-size="10" fill="#333" text-anchor="middle">高</text>
              <text x="35" y="185" font-size="10" fill="#333" text-anchor="middle">低</text>
              <text x="20" y="110" font-size="10" fill="#7b8794" text-anchor="middle">発生確率</text>

              <line x1="60" y1="190" x2="400" y2="190" stroke="#333" stroke-width="1.5"/>
              <text x="80" y="205" font-size="10" fill="#333" text-anchor="middle">低</text>
              <text x="380" y="205" font-size="10" fill="#333" text-anchor="middle">高</text>
              <text x="230" y="217" font-size="10" fill="#7b8794" text-anchor="middle">影響度</text>
            </svg>
          `,
          caption: 'リスクへの対応戦略は、リスクの発生確率と影響度の組み合わせに応じて使い分けるのが一般的な考え方である(実際の適用は個々のリスクの性質やプロジェクトの状況によって判断される)。'
        },
        {
          type: 'table',
          headers: ['対応戦略', '内容'],
          rows: [
            ['回避', 'リスクの原因となる作業を計画から取り除くなどして、リスクの発生自体を回避する'],
            ['軽減', 'リスクの発生確率や、発生した際の影響度を下げるための対策をとる'],
            ['転嫁', '保険への加入や外部委託などにより、リスクが顕在化した際の影響を第三者に移す'],
            ['受容', '対策を取らず、リスクが顕在化した場合の影響をそのまま受け入れる(影響が小さいリスクなどに適用)']
          ]
        },
        { type: 'example', label: '例題: リスク対応戦略の使い分け', html: '屋外工事が台風で遅延するリスクについて、工事保険に加入して損失を補填できるようにするのは<strong>転嫁</strong>、屋外作業の工程自体を計画から取り除くのは<strong>回避</strong>、影響が軽微なため特に対策を取らずそのまま受け入れるのは<strong>受容</strong>である。' },
        { type: 'pitfall', label: 'つまずきやすいポイント(リスク)', html: '「転嫁」は保険や外部委託によってリスクの影響を第三者に移す対応であり、リスクの原因そのものを取り除く「回避」とは異なる。また「軽減」は発生確率や影響度を下げる対応であり、無対策のまま受け入れる「受容」と混同しないよう注意する。' }
      ]
    },
    {
      title: '人的資源・コミュニケーション・調達マネジメント',
      blocks: [
        { type: 'paragraph', html: 'プロジェクトマネジメントでは、スケジュールやコストだけでなく、要員体制・情報共有・外部調達といった多様な領域も計画・管理する必要がある。' },
        {
          type: 'iconGrid',
          items: [
            { svg: LABEL_ICON('#eef2ff', '#2f5fe0', '#2f5fe0', '人的資源'), label: '人的資源マネジメント', desc: '要員の確保、役割分担・体制の計画' },
            { svg: LABEL_ICON('#eafaf0', '#1f9d55', '#1f9d55', 'コミュニケーション'), label: 'コミュニケーションマネジメント', desc: '関係者間での情報共有の計画・実施' },
            { svg: LABEL_ICON('#fff4e5', '#c9820a', '#c9820a', '調達'), label: '調達マネジメント', desc: '外部供給者からの資材・サービスの調達' }
          ]
        },
        {
          type: 'table',
          headers: ['マネジメント領域', '説明'],
          rows: [
            ['人的資源マネジメント', 'プロジェクトに必要な要員を確保し、役割分担やチーム体制を計画・管理する'],
            ['コミュニケーションマネジメント', 'ステークホルダー間で、必要な情報を適切なタイミング・手段・頻度で共有するための計画・実施・管理を行う'],
            ['調達マネジメント', 'プロジェクトに必要な資材やサービスを外部の供給者(ベンダー)から調達するための計画立案・契約・管理を行う']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '人的資源・コミュニケーション・調達マネジメントは、いずれもプロジェクトマネジメントの管理対象であるが、対象がそれぞれ異なる(要員体制/情報共有/外部調達)点を区別する。特に、ステークホルダーとの情報共有計画を指すのは「コミュニケーションマネジメント」であり、外部ベンダーとの契約・調達を指す「調達マネジメント」と混同しないよう注意する。' }
      ]
    },
    {
      title: 'アジャイル型のプロジェクト管理とプロジェクトの終結',
      blocks: [
        { type: 'paragraph', html: '近年はスクラムに代表されるアジャイル型開発を採用するプロジェクトも多く、進捗管理の考え方や用語が従来のウォーターフォール型と異なる部分がある。' },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['スプリント', 'スクラムにおける短い開発サイクルの単位(通常1〜4週間程度)。この期間内で計画・実装・レビューを行う'],
            ['プロダクトオーナー', '開発する製品の価値を最大化する責任を持ち、要求事項(プロダクトバックログ)の優先順位付けを行う役割'],
            ['かんばん方式', '作業項目を書いたカードを「未着手」「作業中」「完了」などの列を持つボード上で移動させ、進捗を視覚的に管理する手法'],
            ['バーンダウンチャート', '縦軸に残作業量、横軸に時間をとり、残作業量が減っていく様子を示すグラフ']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 170" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="10" width="130" height="150" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="75" y="30" font-size="12" fill="#333" text-anchor="middle" font-weight="bold">未着手</text>
              <rect x="20" y="40" width="110" height="26" rx="4" fill="#eef2ff" stroke="#2f5fe0"/>
              <text x="75" y="57" font-size="10" fill="#2f5fe0" text-anchor="middle">タスクC</text>
              <rect x="20" y="72" width="110" height="26" rx="4" fill="#eef2ff" stroke="#2f5fe0"/>
              <text x="75" y="89" font-size="10" fill="#2f5fe0" text-anchor="middle">タスクD</text>

              <rect x="150" y="10" width="130" height="150" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="215" y="30" font-size="12" fill="#333" text-anchor="middle" font-weight="bold">作業中</text>
              <rect x="160" y="40" width="110" height="26" rx="4" fill="#fff4e5" stroke="#c9820a"/>
              <text x="215" y="57" font-size="10" fill="#c9820a" text-anchor="middle">タスクB</text>

              <rect x="290" y="10" width="130" height="150" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="355" y="30" font-size="12" fill="#333" text-anchor="middle" font-weight="bold">完了</text>
              <rect x="300" y="40" width="110" height="26" rx="4" fill="#eafaf0" stroke="#1f9d55"/>
              <text x="355" y="57" font-size="10" fill="#1f9d55" text-anchor="middle">タスクA</text>
            </svg>
          `,
          caption: 'かんばん方式: 作業項目を書いたカードを「未着手」「作業中」「完了」などの列の間で移動させることで、誰が見ても進捗状況が一目でわかるようにする。'
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 170" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <line x1="40" y1="20" x2="40" y2="140" stroke="#333" stroke-width="1.5"/>
              <line x1="40" y1="140" x2="380" y2="140" stroke="#333" stroke-width="1.5"/>
              <text x="8" y="18" font-size="9" fill="#7b8794">残作業量</text>
              <text x="355" y="155" font-size="9" fill="#7b8794">時間</text>

              <line x1="40" y1="25" x2="375" y2="135" stroke="#c7cdd6" stroke-width="2" stroke-dasharray="4,4"/>
              <text x="230" y="70" font-size="9" fill="#7b8794">理想線</text>

              <polyline points="40,25 110,50 180,60 250,95 320,110 375,135" fill="none" stroke="#2f5fe0" stroke-width="2.5"/>
              <text x="250" y="88" font-size="9" fill="#2f5fe0" font-weight="bold">実績線</text>
            </svg>
          `,
          caption: 'バーンダウンチャート: 日々の残作業量の推移を折れ線で示す。理想線(計画どおりに減った場合)と実績線を比較することで、進捗が計画より遅れているか進んでいるかを視覚的に把握できる。'
        },
        { type: 'paragraph', html: 'プロジェクトの最終段階では、成果物の納品や契約の終了確認、得られた教訓の取りまとめなどを行う「プロジェクト終結」のプロセスを経て、プロジェクトは完了する。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'かんばん方式はボード上でカードを移動させて「作業の状態」を可視化する手法であり、時間経過に伴う残作業量の推移を折れ線で示す「バーンダウンチャート」とは表現方法が異なる。また、スプリントは「開発サイクルの単位(期間)」を指す言葉であり、「役割」を指すプロダクトオーナーと混同しないよう注意する。' }
      ]
    }
  ]
};
