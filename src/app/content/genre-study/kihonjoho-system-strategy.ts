import { GenreContent } from '../../models/genre-content.models';

export const KIHONJOHO_SYSTEM_STRATEGY_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'system-strategy',
  genreName: 'システム戦略',
  category: 'ストラテジ系',
  description: '情報システム戦略の考え方から、EA・BPR・ERPによる業務最適化、システム調達で使われるRFP/RFI、情報活用を支える仕組み、IoT・AI・DXといった動向まで、システム戦略で問われる要点を整理しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '情報システム戦略と業務最適化の手法(EA・BPR・ERP)',
      relatedExamples: '関連する出題例: 「経営戦略を実現するために、情報システムをどのように構築・活用していくかを策定する計画を何と呼ぶか」「企業全体の業務やシステムを、ビジネス・データ・アプリケーション・技術という観点から体系的にとらえ、最適化を図るための設計手法を何と呼ぶか」「既存の業務プロセスを抜本的に見直し、根本から再設計することで、業務の効率化や品質向上を図る手法を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '情報システム戦略とは、経営戦略や事業目標を達成するために、情報システムをどのように整備・活用していくかを定める計画である。個々の業務システムの改善にとどまらず、企業全体を俯瞰して情報システムのあるべき姿を描く点が特徴である。' },
        { type: 'paragraph', html: 'この情報システム戦略を実現するための代表的な考え方・手法として、エンタープライズアーキテクチャ(EA)・BPR・ERPがある。いずれも部分最適ではなく企業全体の効率化・最適化を目指す点で共通するが、扱っている対象のレベルが異なる。' },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['エンタープライズアーキテクチャ(EA)', '企業全体の業務やシステムを「ビジネス」「データ」「アプリケーション」「技術」の4つの観点から体系的にとらえ、全体最適化を図るための設計手法・考え方'],
            ['BPR(業務プロセス改革)', '既存の業務プロセスを部分的な改善にとどめず、抜本的に見直し・再設計することで、業務の効率化・品質向上・コスト削減を図る手法'],
            ['ERP(統合基幹業務システム)', '企業の経営資源(ヒト・モノ・カネ・情報)を統合的に管理し、生産・販売・会計・人事など複数の業務プロセスを一元的に扱う手法・システム']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 170" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="60" y="8" width="300" height="36" rx="6" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
              <text x="210" y="31" font-size="12" fill="#7c3aed" text-anchor="middle" font-weight="bold">エンタープライズアーキテクチャ(全体最適化)</text>
              <line x1="105" y1="44" x2="52" y2="80" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="3,3"/>
              <line x1="165" y1="44" x2="156" y2="80" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="3,3"/>
              <line x1="255" y1="44" x2="264" y2="80" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="3,3"/>
              <line x1="315" y1="44" x2="368" y2="80" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="3,3"/>

              <rect x="0" y="80" width="104" height="60" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="52" y="105" font-size="12" fill="#2f5fe0" text-anchor="middle" font-weight="bold">ビジネス</text>
              <text x="52" y="122" font-size="9" fill="#2f5fe0" text-anchor="middle">業務・組織</text>

              <rect x="108" y="80" width="104" height="60" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="160" y="105" font-size="12" fill="#1f9d55" text-anchor="middle" font-weight="bold">データ</text>
              <text x="160" y="122" font-size="9" fill="#1f9d55" text-anchor="middle">情報の構造</text>

              <rect x="216" y="80" width="104" height="60" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="268" y="105" font-size="11" fill="#c9820a" text-anchor="middle" font-weight="bold">アプリケーション</text>
              <text x="268" y="122" font-size="9" fill="#c9820a" text-anchor="middle">業務システム</text>

              <rect x="324" y="80" width="96" height="60" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="372" y="105" font-size="12" fill="#0f8fa8" text-anchor="middle" font-weight="bold">技術</text>
              <text x="372" y="122" font-size="9" fill="#0f8fa8" text-anchor="middle">基盤・インフラ</text>
            </svg>
          `,
          caption: 'エンタープライズアーキテクチャ(EA): 企業全体を「ビジネス」「データ」「アプリケーション」「技術」の4つの観点から体系的にとらえ、部分最適ではなく全体最適化を図る設計手法である。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'EA・BPR・ERPはいずれも「全体最適化」というキーワードで結び付けて出題されやすいが、対象のレベルが異なる。EAは企業全体を4つの観点から体系的に捉える<strong>設計の枠組み</strong>、BPRは業務プロセスを抜本的に見直す<strong>改革の手法</strong>、ERPはヒト・モノ・カネ・情報を一元管理する<strong>システム・仕組み</strong>である。名称と役割を対応づけて覚える。' }
      ]
    },
    {
      title: 'システム調達における提案依頼(RFPとRFI)',
      relatedExamples: '関連する出題例: 「システムの調達にあたり、発注者が要求する内容や条件を明確にして提案を依頼するために、ベンダーに提示する文書を何と呼ぶか」「システムの調達を検討する初期段階で、ベンダーが提供できる製品・技術・実績などの情報の提供を依頼するために提示する文書を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'システムを外部のベンダーから調達する際には、発注者(ユーザー企業)側が要求内容を整理し、それを文書としてベンダーに提示するという手順を踏む。この調達プロセスで用いられる代表的な文書がRFI(情報提供依頼書)とRFP(提案依頼書)である。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 100" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="45" y="12" font-size="9" fill="#7b8794" text-anchor="middle">検討初期</text>
              <rect x="0" y="20" width="90" height="50" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="45" y="41" font-size="11" fill="#2f5fe0" text-anchor="middle" font-weight="bold">RFI</text>
              <text x="45" y="57" font-size="9" fill="#2f5fe0" text-anchor="middle">情報提供依頼</text>
              <line x1="90" y1="45" x2="125" y2="45" stroke="#333" stroke-width="1.5"/>

              <text x="170" y="12" font-size="9" fill="#7b8794" text-anchor="middle">要求確定後</text>
              <rect x="125" y="20" width="90" height="50" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="170" y="41" font-size="11" fill="#1f9d55" text-anchor="middle" font-weight="bold">RFP</text>
              <text x="170" y="57" font-size="9" fill="#1f9d55" text-anchor="middle">提案依頼</text>
              <line x1="215" y1="45" x2="250" y2="45" stroke="#333" stroke-width="1.5"/>

              <rect x="250" y="20" width="90" height="50" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="295" y="41" font-size="11" fill="#c9820a" text-anchor="middle" font-weight="bold">提案書・見積</text>
              <text x="295" y="57" font-size="9" fill="#c9820a" text-anchor="middle">ベンダーから受領</text>
              <line x1="340" y1="45" x2="375" y2="45" stroke="#333" stroke-width="1.5"/>

              <rect x="375" y="20" width="45" height="50" rx="6" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="397" y="41" font-size="10" fill="#333" text-anchor="middle">選定</text>
              <text x="397" y="57" font-size="10" fill="#333" text-anchor="middle">契約</text>
            </svg>
          `,
          caption: '調達の流れ: 検討初期にRFIでベンダーの情報を集め、要求が固まった段階でRFPにより具体的な提案を依頼し、受領した提案書・見積を比較してベンダーを選定する。'
        },
        {
          type: 'table',
          headers: ['項目', 'RFI(情報提供依頼書)', 'RFP(提案依頼書)'],
          rows: [
            ['目的', 'ベンダーが持つ製品・技術・実績などの情報を集める', '発注者が要求する機能・条件を明確に伝え、提案を依頼する'],
            ['提示するタイミング', '調達検討の初期段階(要求がまだ固まっていない)', '要求内容がある程度固まった段階'],
            ['ベンダーからの回答', '製品・技術・実績などの情報・資料', '要求を満たす具体的な提案書・見積書']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'RFIは調達検討の初期段階で、ベンダーが「何を提供できるか」という情報を集めるための文書であるのに対し、RFPは発注者側の要求がある程度固まった段階で、その要求を満たす具体的な提案を依頼する文書である。<strong>「情報を集める(RFI)」のか「提案を依頼する(RFP)」のか</strong>を、提示するタイミングとセットで覚えると区別しやすい。' }
      ]
    },
    {
      title: '情報共有・情報活用を支える仕組み',
      relatedExamples: '関連する出題例: 「電子メール・電子掲示板・スケジュール管理などの機能を統合し、組織内の情報共有や共同作業を支援するソフトウェアを何と呼ぶか」「企業内の様々な業務システムから蓄積されたデータを、分析や意思決定に活用しやすい形で統合・格納した大規模なデータベースを何と呼ぶか」「蓄積されたデータを分析し、経営上の意思決定に役立つ情報をグラフやレポートとして可視化するためのツールを何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '企業活動を支える情報システムには、人と人との情報共有・共同作業を支援するものと、データを蓄積・分析して経営の意思決定を支援するものがある。' },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['グループウェア', '電子メール・電子掲示板・スケジュール管理などの機能を統合し、組織内の情報共有やメンバー間の共同作業を支援するソフトウェア'],
            ['データウェアハウス', '企業内の様々な業務システムから収集・蓄積したデータを、時系列に整理し、経営分析や意思決定に活用しやすい形で統合・格納した大規模なデータベース'],
            ['BIツール', '企業に蓄積された大量のデータを分析し、経営上の意思決定に役立つ情報をグラフやレポートの形で可視化するためのツール']
          ]
        },
        { type: 'paragraph', html: '一般に、各業務システムから収集したデータをデータウェアハウスに蓄積し、そのデータをBIツールで分析・可視化することで経営判断に役立てる、という流れで用いられる。グループウェアは人同士の情報共有が中心である一方、データウェアハウス・BIツールはデータの蓄積・分析が中心であり、目的が異なる点を押さえておく。' },
        { type: 'example', label: '例題: 情報活用の流れ', html: '各店舗のPOSシステムに蓄積された売上データを<strong>データウェアハウス</strong>に集約し、<strong>BIツール</strong>で地域別・商品別の売上傾向を分析してグラフ化した。このように、蓄積・整理されたデータを分析し可視化するのがBIツールの役割である。' }
      ]
    },
    {
      title: '先端技術の動向とDX',
      relatedExamples: '関連する出題例: 「家電や自動車、センサなど、様々な「モノ」がインターネットに接続され、情報のやり取りを行う仕組みを何と呼ぶか」「大量のデータからコンピュータ自身が規則性やパターンを学習し、未知のデータに対する予測や判断を行えるようにする技術を何と呼ぶか」「デジタル技術を活用して、製品・サービス・ビジネスモデルや組織文化そのものを変革し、競争上の優位性を確立する取り組みを何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '近年の出題では、IoTや機械学習(AI)といった先端技術と、それらを活用したDX(デジタルトランスフォーメーション)についても問われる。IoT・機械学習は価値創出のための「手段」であり、DXはそれらを活用して事業そのものを変革する「取り組み」である点を意識して整理する。' },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['IoT(Internet of Things)', '家電・自動車・各種センサなど、様々な「モノ」がインターネットに接続され、相互に情報をやり取りする仕組み'],
            ['機械学習', 'AI(人工知能)を実現する技術の1つであり、大量のデータからコンピュータ自身が規則性やパターンを学習し、未知のデータに対する予測や判断を行えるようにする技術'],
            ['DX(デジタルトランスフォーメーション)', 'デジタル技術を活用して、製品・サービス・ビジネスモデルや組織文化そのものを変革し、競争上の優位性を確立する取り組み']
          ]
        },
        { type: 'example', label: '例題: IoT・機械学習からDXへ', html: '工場の設備にセンサを取り付けて稼働データを収集し(<strong>IoT</strong>)、蓄積したデータを<strong>機械学習</strong>で分析して故障の予兆を検知できるようにした。これにより保守業務の在り方そのものを見直すことができれば、それは<strong>DX</strong>の一例といえる。IoT・機械学習は手段、DXはそれによってもたらされる事業・組織の変革である。' }
      ]
    }
  ]
};
