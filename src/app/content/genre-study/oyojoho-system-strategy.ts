import { GenreContent } from '../../models/genre-content.models';

export const OYOJOHO_SYSTEM_STRATEGY_CONTENT: GenreContent = {
  examType: 'oyojoho',
  genreKey: 'system-strategy',
  genreName: 'システム戦略',
  category: 'ストラテジ系',
  description: '情報システム戦略の全体最適化を担うEA・BPR・ERPの使い分け、システム調達で用いられるRFP等の文書の性質、SaaS・PaaS・IaaSといったクラウドサービスの提供形態と管理範囲など、応用情報技術者試験のシステム戦略分野で問われる実践的な判断のポイントを整理しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '情報システム戦略における全体最適化の手法(EA・BPR・ERP)',
      relatedExamples: '関連する出題例: 「業務プロセスを抜本的に見直し、組織構造や業務フローを再設計することで、大幅な業務改善を図る経営手法はどれか」「企業の業務全体(会計・人事・生産・販売など)を統合的に管理し、経営資源の最適活用を図るための統合基幹業務システムはどれか」「経営戦略とIT戦略を整合させ、組織の業務・情報システムの全体構造を体系的に設計・管理する考え方・手法はどれか」など',
      blocks: [
        { type: 'paragraph', html: '情報システム戦略の実現に向けては、EA(エンタープライズアーキテクチャ)・BPR(業務プロセスリエンジニアリング)・ERP(統合基幹業務システム)という3つの手法が組み合わせて用いられる。いずれも「全体最適化」を志向する点は共通するが、扱う対象のレベルが「全社構造の設計指針」「業務プロセスそのものの改革」「業務を支えるシステム基盤」と異なるため、単なる用語の丸暗記ではなく、実務でどう連携して使われるかを理解しておく必要がある。' },
        { type: 'paragraph', html: 'EAは、ビジネスアーキテクチャ・データアーキテクチャ・アプリケーションアーキテクチャ・テクノロジアーキテクチャという4つの観点(いわゆるBDAT)から、経営戦略とIT戦略を整合させながら組織全体の業務と情報システムの構造を体系的に設計する「指針・枠組み」である。この指針に基づいて個々の業務プロセスを抜本的に再設計する「改革の手法」がBPRであり、再設計された業務プロセスを実際に動かす「システム基盤」として導入されるのがERPである、という関係で整理すると覚えやすい。' },
        {
          type: 'table',
          headers: ['用語', '対象・レベル', 'ポイント'],
          rows: [
            ['エンタープライズアーキテクチャ(EA)', '経営戦略とIT戦略の整合、全社の業務・情報システムの全体構造', 'ビジネス・データ・アプリケーション・テクノロジの4アーキテクチャ(BDAT)から体系的に設計する「指針・枠組み」'],
            ['BPR(業務プロセスリエンジニアリング)', '個別の業務プロセスそのもの', '既存プロセスを部分改善にとどめず、組織構造や業務フローをゼロベースで抜本的に再設計する「改革の手法」'],
            ['ERP(統合基幹業務システム)', '会計・人事・生産・販売など基幹業務システム', '経営資源(ヒト・モノ・カネ・情報)を統合管理し、再設計後の業務プロセスを実際に支える「システム基盤」']
          ]
        },
        { type: 'example', label: '例題: EA・BPR・ERPの適用順序', html: '全社的な業務改革を進めるA社は、まず<strong>EA</strong>によって経営戦略とIT戦略を整合させ、全社の業務・システムの構造をビジネス・データ・アプリケーション・テクノロジの観点から整理した。次に、その指針に沿って重複・非効率な業務プロセスを<strong>BPR</strong>で抜本的に再設計し、最後に再設計後の業務を統合的に支えるシステムとして<strong>ERP</strong>パッケージを導入した。このように、EAが指針、BPRが改革、ERPが実装基盤という順序で連携する点が実務上のポイントである。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ERPは会計・人事・生産・販売など基幹業務全体を統合的に扱う点が特徴であり、特定の業務領域に特化したシステムとは対象範囲が異なる。たとえばSFA(営業支援システム)は営業活動、CRM(顧客関係管理)は顧客対応、SCM(供給連鎖管理)は調達・生産・物流の連鎖に特化しており、いずれもERPほど対象範囲が広くない。選択肢に紛らわしい略語が並ぶ場合は「全社の基幹業務全体を統合管理するか、特定の業務領域に特化しているか」で切り分ける。' }
      ]
    },
    {
      title: 'システム調達における提案依頼と関連文書(RFP・RFI・RFQ・NDA)',
      relatedExamples: '関連する出題例: 「システム調達において、発注先候補の企業に対し具体的な提案内容や見積りの提出を依頼する文書はどれか」など',
      blocks: [
        { type: 'paragraph', html: 'システムを外部ベンダーから調達する際は、検討段階に応じて性質の異なる文書を使い分ける。おおまかな流れは、①ベンダーの製品・技術・実績に関する情報を集めるRFI(情報提供依頼書)、②要件がある程度固まった段階で具体的な実現方法・体制・見積りを含む提案を依頼するRFP(提案依頼書)、③価格のみに絞って見積りを依頼するRFQ(見積依頼書)、という順に進む。また、機密情報を開示する前段階ではNDA(秘密保持契約書)を締結し、情報漏えいのリスクに備える。' },
        {
          type: 'table',
          headers: ['文書', '目的', 'タイミング'],
          rows: [
            ['RFI(情報提供依頼書)', 'ベンダーが持つ製品・技術・実績などの情報を収集する', '調達検討の初期段階(要件がまだ固まっていない)'],
            ['RFP(提案依頼書)', '要件を提示し、実現方法・体制・見積りを含めた具体的な提案を依頼する', '要件がある程度固まった段階'],
            ['RFQ(見積依頼書)', '提案内容ではなく、価格・見積りの提示のみを依頼する', 'ベンダーや調達仕様がほぼ確定した段階'],
            ['NDA(秘密保持契約書)', '提案・見積りの過程で開示する機密情報の取り扱いについて秘密保持を取り決める契約', 'RFI・RFPなどで機密情報を開示する前']
          ]
        },
        { type: 'example', label: '例題: 調達フェーズと文書の対応', html: '新システムの導入を検討するA社は、まず候補となる複数のベンダーに対して製品・実績に関する情報提供を依頼した(<strong>RFI</strong>)。要件がまとまった段階で、実現方法や体制、見積りを含む具体的な提案の提出を依頼し(<strong>RFP</strong>)、自社の機密性の高いデータを開示するにあたっては事前に秘密保持契約を締結した(<strong>NDA</strong>)。RFI・RFP・NDAはそれぞれ役割もタイミングも異なる文書である。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'RFPは「見積りの提出を依頼する」側面も持つため、見積りに関する文書=RFQと早合点しやすいが、RFPは見積りだけでなく実現方法や実施体制を含めた提案全体を依頼する文書である点で、価格提示のみに特化したRFQより対象範囲が広い。また、NDAは提案や見積りを依頼する文書ではなく、機密情報の取り扱いを取り決める契約文書である点も混同しやすいので注意する。' }
      ]
    },
    {
      title: 'クラウドサービスの提供形態と管理範囲(SaaS・PaaS・IaaS・DaaS)',
      relatedExamples: '関連する出題例: 「ソフトウェアをインターネット経由でサービスとして利用者に提供する形態はどれか」「インフラ(サーバ・ネットワークなど)を仮想化されたリソースとしてインターネット経由で提供するクラウドサービスの形態はどれか」など',
      blocks: [
        { type: 'paragraph', html: 'クラウドコンピューティングのサービス形態は、「インフラ」「OS・ミドルウェア」「アプリケーション」のうち、どこまでをクラウド事業者側が管理し、どこからを利用者側が構築・管理するかによって分類される。代表的な形態がIaaS・PaaS・SaaSであり、これに仮想デスクトップ環境を提供するDaaSが加わる。自社オンプレミス環境から右へ進むほど、利用者側が管理する範囲が狭くなる。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="50" y="16" font-size="11" fill="#333" text-anchor="middle" font-weight="bold">オンプレミス</text>
              <text x="155" y="16" font-size="11" fill="#333" text-anchor="middle" font-weight="bold">IaaS</text>
              <text x="260" y="16" font-size="11" fill="#333" text-anchor="middle" font-weight="bold">PaaS</text>
              <text x="365" y="16" font-size="11" fill="#333" text-anchor="middle" font-weight="bold">SaaS</text>

              <rect x="5" y="24" width="90" height="38" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="50" y="48" font-size="9" fill="#2f5fe0" text-anchor="middle">アプリ</text>
              <rect x="5" y="66" width="90" height="38" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="50" y="90" font-size="9" fill="#2f5fe0" text-anchor="middle">OS/MW</text>
              <rect x="5" y="108" width="90" height="38" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="50" y="132" font-size="9" fill="#2f5fe0" text-anchor="middle">インフラ</text>

              <rect x="110" y="24" width="90" height="38" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="155" y="48" font-size="9" fill="#2f5fe0" text-anchor="middle">アプリ</text>
              <rect x="110" y="66" width="90" height="38" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="155" y="90" font-size="9" fill="#2f5fe0" text-anchor="middle">OS/MW</text>
              <rect x="110" y="108" width="90" height="38" rx="4" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="155" y="132" font-size="9" fill="#1f9d55" text-anchor="middle">インフラ</text>

              <rect x="215" y="24" width="90" height="38" rx="4" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="260" y="48" font-size="9" fill="#2f5fe0" text-anchor="middle">アプリ</text>
              <rect x="215" y="66" width="90" height="38" rx="4" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="260" y="90" font-size="9" fill="#1f9d55" text-anchor="middle">OS/MW</text>
              <rect x="215" y="108" width="90" height="38" rx="4" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="260" y="132" font-size="9" fill="#1f9d55" text-anchor="middle">インフラ</text>

              <rect x="320" y="24" width="90" height="38" rx="4" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="365" y="48" font-size="9" fill="#1f9d55" text-anchor="middle">アプリ</text>
              <rect x="320" y="66" width="90" height="38" rx="4" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="365" y="90" font-size="9" fill="#1f9d55" text-anchor="middle">OS/MW</text>
              <rect x="320" y="108" width="90" height="38" rx="4" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="365" y="132" font-size="9" fill="#1f9d55" text-anchor="middle">インフラ</text>

              <rect x="40" y="162" width="14" height="14" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="60" y="173" font-size="10" fill="#333">利用者側が管理</text>
              <rect x="220" y="162" width="14" height="14" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="240" y="173" font-size="10" fill="#333">クラウド事業者側が管理</text>
            </svg>
          `,
          caption: 'IaaS・PaaS・SaaSでは、オンプレミスに比べてインフラ→OS・ミドルウェア→アプリケーションの順にクラウド事業者側が管理する範囲が広がり、利用者側が構築・管理すべき範囲が狭くなる。'
        },
        {
          type: 'table',
          headers: ['提供形態', '提供される範囲', '利用者が管理する範囲'],
          rows: [
            ['IaaS(Infrastructure as a Service)', 'サーバ・ストレージ・ネットワークなどインフラを仮想化されたリソースとして提供', 'OS・ミドルウェア・アプリケーションを利用者側で構築・管理する'],
            ['PaaS(Platform as a Service)', 'インフラに加え、OS・ミドルウェアなどアプリケーションの実行環境を提供', 'アプリケーションのみを利用者側で開発・運用する'],
            ['SaaS(Software as a Service)', 'インフラからアプリケーションまで、ソフトウェアの機能をサービスとして提供', '利用者側での構築・管理は基本的に不要(設定・データ入力のみ)'],
            ['DaaS(Desktop as a Service)', '仮想デスクトップ環境そのものをサービスとして提供', 'デスクトップ上で使うアプリケーションやデータの管理']
          ]
        },
        { type: 'example', label: '例題: 用途に応じたクラウドサービスの選択', html: '自社でアプリケーションを開発したいが、OSやミドルウェアの構築・保守の手間は省きたい場合は<strong>PaaS</strong>を選ぶ。既存の会計ソフトをそのままインターネット経由で利用したいだけであれば<strong>SaaS</strong>を選ぶ。サーバのハードウェア調達や仮想化基盤の運用は外部化しつつ、OS以上は自社で柔軟に構築・運用したい場合は<strong>IaaS</strong>を選ぶ。このように、自社がどこまで管理したいかによって適切な提供形態を使い分ける。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'DaaSは仮想デスクトップ環境(利用者の操作画面そのもの)を提供するサービスであり、サーバ・ネットワークなどインフラのリソースを提供するIaaSとは提供対象が異なるため混同しないこと。また、SaaSは自社でサーバやソフトウェアを保有・運用する必要がない点が、ソフトウェアを自社に導入して運用するオンプレミスのパッケージソフトウェアとの本質的な違いである。' }
      ]
    }
  ]
};
