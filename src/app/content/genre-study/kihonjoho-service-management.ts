import { GenreContent } from '../../models/genre-content.models';

const LABEL_ICON = (fill: string, stroke: string, textColor: string, label: string, fontSize: number = 12) => `
  <svg viewBox="0 0 100 60" width="100%" height="60">
    <rect x="6" y="10" width="88" height="40" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <text x="50" y="35" font-size="${fontSize}" fill="${textColor}" text-anchor="middle" font-weight="bold">${label}</text>
  </svg>
`;

export const KIHONJOHO_SERVICE_MANAGEMENT_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'service-management',
  genreName: 'サービスマネジメント',
  category: 'マネジメント系',
  description: 'ITILに基づくITサービスマネジメントの各プロセス(インシデント管理・問題管理・変更管理など)や、SLA・BCP・RTO/RPOといった重要な用語・指標を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: 'サービスマネジメントの全体像(ITIL・SLA・SLM・サービスカタログ)',
      relatedExamples: '関連する出題例: 「ITILの説明として、正しいものはどれか」「ITサービスの提供者と利用者の間で、提供するサービスの品質・範囲・目標値などについて合意した文書を何と呼ぶか」「サービスレベルの目標値(SLA)を継続的に監視・見直しし、サービス品質を維持・改善していくプロセスを何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '組織が利用者に提供するITサービスの品質を継続的に維持・向上させるための管理活動を、ITサービスマネジメントという。ITIL(Information Technology Infrastructure Library)は、ITサービスマネジメントにおける成功事例(ベストプラクティス)を体系的にまとめたフレームワークであり、世界的に広く参照されている。' },
        {
          type: 'table',
          headers: ['名称', '分野', '説明'],
          rows: [
            ['ITIL', 'ITサービスマネジメント', 'ITサービスマネジメントにおけるベストプラクティスをまとめたフレームワーク'],
            ['ISMS', '情報セキュリティ', '情報セキュリティを組織的・体系的に管理するための仕組み(ISO/IEC 27001に基づき認証取得も可能)'],
            ['PMBOK', 'プロジェクトマネジメント', 'プロジェクトマネジメントの知識体系をまとめたガイド']
          ]
        },
        { type: 'paragraph', html: 'ITサービスを提供するにあたっては、提供するサービスの内容や品質の目標をあらかじめ利用者と合意し、その達成状況を継続的に監視・改善していく仕組みが必要である。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 430 150" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="55" width="95" height="45" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="57" y="73" font-size="11" fill="#2f5fe0" text-anchor="middle" font-weight="bold">SLAの策定</text>
              <text x="57" y="88" font-size="11" fill="#2f5fe0" text-anchor="middle" font-weight="bold">・合意</text>

              <line x1="105" y1="77" x2="135" y2="77" stroke="#333" stroke-width="1.5"/>

              <rect x="135" y="55" width="95" height="45" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="182" y="82" font-size="11" fill="#333" text-anchor="middle">サービス提供</text>

              <line x1="230" y1="77" x2="260" y2="77" stroke="#333" stroke-width="1.5"/>

              <rect x="260" y="55" width="85" height="45" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="302" y="73" font-size="11" fill="#0f8fa8" text-anchor="middle" font-weight="bold">SLM:</text>
              <text x="302" y="88" font-size="11" fill="#0f8fa8" text-anchor="middle" font-weight="bold">監視・測定</text>

              <line x1="345" y1="77" x2="375" y2="77" stroke="#333" stroke-width="1.5"/>

              <rect x="375" y="55" width="50" height="45" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="400" y="73" font-size="10" fill="#1f9d55" text-anchor="middle" font-weight="bold">レビュー</text>
              <text x="400" y="88" font-size="10" fill="#1f9d55" text-anchor="middle" font-weight="bold">・改善</text>

              <path d="M 400 55 L 400 20 L 57 20 L 57 55" fill="none" stroke="#7b8794" stroke-width="1.5" stroke-dasharray="3,3"/>
              <text x="228" y="14" font-size="10" fill="#7b8794" text-anchor="middle">継続的に繰り返す(サービスレベル管理)</text>
            </svg>
          `,
          caption: 'SLA/SLMのサイクル: SLAで合意した目標値をもとにサービスを提供し、SLMがその達成状況を監視・測定し、レビュー・改善を経て次のSLAへとつなげていく。'
        },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['SLA(サービスレベルアグリーメント)', 'サービス提供者と利用者の間で、稼働率や応答時間などのサービスレベルの目標値を明文化して合意した文書'],
            ['サービスレベル管理(SLM)', 'SLAで合意したサービスレベルの達成状況を監視し、継続的にサービス品質を維持・改善していくプロセス'],
            ['サービスカタログ', '組織が提供可能なITサービスの一覧と、それぞれの内容・利用条件などをまとめた文書']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'SLAは提供者と利用者が合意した「文書(目標値)」そのものであるのに対し、SLMはその達成状況を継続的に監視・改善し続ける「プロセス(活動)」である。名称が似ているため混同しやすいが、「文書か、プロセス(活動)か」で区別するとよい。' }
      ]
    },
    {
      title: 'インシデント管理と問題管理',
      relatedExamples: '関連する出題例: 「システムに障害が発生した際、暫定的な対処によって影響を最小限に抑え、通常サービスを迅速に回復させることを目的としたプロセスはどれか」「発生したインシデントの根本原因を特定し、再発防止のための恒久的な対策を検討するプロセスを何と呼ぶか」「既知の障害とその原因、あるいは暫定的な回避策(ワークアラウンド)の情報をまとめて管理する仕組みを何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'ITサービスの運用中に発生する障害やトラブルへの対応は、目的の異なる2つのプロセスに分かれる。インシデント管理は「とにかく早くサービスを元に戻すこと」を、問題管理は「二度と同じことが起きないよう根本原因を突き止めること」を目的とする。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 190" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="0" y="15" width="80" height="45" rx="6" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="40" y="35" font-size="11" fill="#d64545" text-anchor="middle" font-weight="bold">インシデント</text>
              <text x="40" y="49" font-size="11" fill="#d64545" text-anchor="middle" font-weight="bold">発生</text>

              <line x1="80" y1="37" x2="105" y2="37" stroke="#333" stroke-width="1.5"/>

              <rect x="105" y="15" width="120" height="45" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="165" y="35" font-size="11" fill="#2f5fe0" text-anchor="middle" font-weight="bold">インシデント管理</text>
              <text x="165" y="50" font-size="9" fill="#2f5fe0" text-anchor="middle">(暫定対応・迅速復旧)</text>

              <line x1="225" y1="37" x2="250" y2="37" stroke="#333" stroke-width="1.5"/>

              <rect x="250" y="15" width="90" height="45" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="295" y="42" font-size="11" fill="#1f9d55" text-anchor="middle" font-weight="bold">サービス復旧</text>

              <line x1="165" y1="60" x2="165" y2="120" stroke="#333" stroke-width="1.5"/>
              <text x="178" y="95" font-size="9" fill="#333">再発する場合</text>

              <rect x="95" y="120" width="140" height="45" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="165" y="140" font-size="11" fill="#c9820a" text-anchor="middle" font-weight="bold">問題管理</text>
              <text x="165" y="155" font-size="9" fill="#c9820a" text-anchor="middle">(根本原因の特定)</text>

              <line x1="235" y1="142" x2="260" y2="142" stroke="#333" stroke-width="1.5"/>

              <rect x="260" y="120" width="95" height="45" rx="6" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
              <text x="307" y="140" font-size="10" fill="#7c3aed" text-anchor="middle" font-weight="bold">既知の誤り</text>
              <text x="307" y="153" font-size="10" fill="#7c3aed" text-anchor="middle" font-weight="bold">として登録</text>

              <line x1="355" y1="142" x2="380" y2="142" stroke="#333" stroke-width="1.5"/>

              <rect x="380" y="120" width="55" height="45" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="407" y="138" font-size="9" fill="#0f8fa8" text-anchor="middle" font-weight="bold">変更管理</text>
              <text x="407" y="151" font-size="9" fill="#0f8fa8" text-anchor="middle" font-weight="bold">へ</text>
            </svg>
          `,
          caption: 'インシデント管理は暫定対応で迅速にサービスを復旧させる。同じ障害が繰り返される場合は問題管理が根本原因を調査し、既知の誤りとして記録した上で、恒久対策を変更管理のプロセスに引き継ぐ。'
        },
        {
          type: 'table',
          headers: ['項目', 'インシデント管理', '問題管理'],
          rows: [
            ['目的', 'サービスを迅速に復旧させる(暫定対応)', '根本原因を特定し、恒久的な再発防止策を講じる'],
            ['対応の考え方', '迅速性を最優先し、応急処置(ワークアラウンド)でよい', '時間をかけてでも原因究明・恒久対策を優先する'],
            ['主な成果物', 'ワークアラウンドによるサービス復旧', '恒久対策の実施、既知の誤り(Known Error)としての登録']
          ]
        },
        { type: 'paragraph', html: '問題管理の過程で原因が特定されているが、まだ恒久的な解決に至っていない障害は、「既知の誤り(Known Error)」としてその内容や暫定的な回避策(ワークアラウンド)とともに記録・管理される。同様の障害が再発した際、インシデント管理はこの情報を参照することで迅速に暫定対応できる。' },
        { type: 'example', label: '例題: インシデント管理と問題管理の連携', html: 'あるサーバでアプリケーションが度々応答しなくなる障害が発生している。<strong>インシデント管理</strong>では、発生の都度サーバを再起動して速やかにサービスを復旧させる(暫定対応)。並行して<strong>問題管理</strong>では、なぜ繰り返し応答しなくなるのか根本原因(例: メモリリーク)を調査する。原因は特定できたがすぐに恒久対策(プログラム修正)を適用できない場合、その内容と再起動という回避策を「既知の誤り」として登録しておく。恒久対策を本番環境に適用する際は<strong>変更管理</strong>のプロセスを経て統制される。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'インシデント管理は「サービスを止めない・早く戻す」ことが目的であり、根本原因の特定は目的としない。一方、問題管理は根本原因の特定・恒久対策の検討が目的であり、必ずしも迅速さを優先しない。この「速さ優先か、原因究明優先か」という目的の違いが問われやすい。' }
      ]
    },
    {
      title: '変更管理・構成管理・リリース管理',
      relatedExamples: '関連する出題例: 「IT環境に対する変更が及ぼす影響を評価し、承認・実施・記録を統制することで、変更に伴うリスクを管理するプロセスを何と呼ぶか」「開発・テストが完了したソフトウェアや変更を、本番環境へ計画的に展開・導入するプロセスを何と呼ぶか」「IT資産(サーバ・ソフトウェア・ネットワーク機器など)の構成情報を一元的に記録・管理するデータベースを何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'IT環境に変更を加える際には、変更そのものを統制する「変更管理」、変更後の本番環境への展開を担う「リリース管理」、そして構成要素の情報を正確に維持する「構成管理」という、目的の異なる3つのプロセスが連携する。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 430 180" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="0" y="15" width="90" height="45" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="45" y="35" font-size="10" fill="#333" text-anchor="middle">変更要求</text>
              <text x="45" y="49" font-size="10" fill="#333" text-anchor="middle">(RFC)</text>

              <line x1="90" y1="37" x2="115" y2="37" stroke="#333" stroke-width="1.5"/>

              <rect x="115" y="15" width="110" height="45" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="170" y="35" font-size="11" fill="#2f5fe0" text-anchor="middle" font-weight="bold">変更管理</text>
              <text x="170" y="49" font-size="9" fill="#2f5fe0" text-anchor="middle">(評価・承認・統制)</text>

              <line x1="225" y1="37" x2="250" y2="37" stroke="#333" stroke-width="1.5"/>

              <rect x="250" y="15" width="110" height="45" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="305" y="35" font-size="11" fill="#1f9d55" text-anchor="middle" font-weight="bold">リリース管理</text>
              <text x="305" y="49" font-size="9" fill="#1f9d55" text-anchor="middle">(本番環境へ展開)</text>

              <line x1="170" y1="60" x2="170" y2="110" stroke="#333" stroke-width="1.5" stroke-dasharray="3,3"/>
              <line x1="305" y1="60" x2="305" y2="110" stroke="#333" stroke-width="1.5" stroke-dasharray="3,3"/>

              <rect x="95" y="110" width="290" height="55" rx="6" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
              <text x="240" y="133" font-size="11" fill="#7c3aed" text-anchor="middle" font-weight="bold">構成管理データベース(CMDB)</text>
              <text x="240" y="150" font-size="10" fill="#7c3aed" text-anchor="middle">構成アイテム(CI)の情報を正確に記録・維持</text>
            </svg>
          `,
          caption: '変更要求(RFC)は変更管理で評価・承認され、リリース管理によって本番環境へ展開される。いずれの結果も構成管理データベース(CMDB)に反映され、構成情報が常に最新の状態に保たれる。'
        },
        {
          type: 'table',
          headers: ['プロセス', '目的'],
          rows: [
            ['変更管理', '変更が及ぼす影響を評価し、承認・実施・記録を統制することで、変更に伴うリスクを管理する'],
            ['構成管理', 'IT環境における構成要素(ハードウェア、ソフトウェア等)の情報を正確に把握し、管理する'],
            ['リリース管理', '開発・テストが完了したソフトウェアや変更を、本番環境へ計画的に展開・導入する']
          ]
        },
        { type: 'paragraph', html: '構成管理では、サーバやソフトウェア、ネットワーク機器などの構成要素(構成アイテム、CI)に関する情報を、構成管理データベース(CMDB: Configuration Management Database)に一元的に記録・管理する。変更管理やリリース管理によって環境に変更が加わった際は、CMDBの情報もあわせて更新され、常に実態と一致した最新の構成情報が維持される。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '3つのプロセスは連携して動くため混同しやすい。「変更してよいか判断・統制する」のが変更管理、「変更内容を実際に本番環境へ展開する」のがリリース管理、「環境の現状の情報を正確に記録しておく」のが構成管理、という役割分担で覚えるとよい。' }
      ]
    },
    {
      title: 'キャパシティ管理・可用性管理・ファシリティマネジメント・財務管理',
      relatedExamples: '関連する出題例: 「将来の業務量やシステム利用状況を予測し、必要な処理能力(キャパシティ)を適切な時期に確保するプロセスを何と呼ぶか」「合意したサービスレベルに基づき、ITサービスが必要なときに利用可能な状態を維持するための活動を何と呼ぶか」「データセンタなどの設備において、電源・空調・入退室管理などの物理的な環境を維持・管理する活動を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'ITサービスを安定して提供し続けるためには、将来必要となる処理能力を見積もる活動や、サービスが必要なときに利用できる状態を維持する活動、物理的な設備環境を維持する活動、コストを適切に管理する活動など、基盤を支える複数の管理プロセスが必要である。' },
        {
          type: 'iconGrid',
          items: [
            { svg: LABEL_ICON('#eef2ff', '#2f5fe0', '#2f5fe0', 'キャパシティ管理', 9), label: 'キャパシティ管理', desc: '将来必要な処理能力を予測し、適切な時期に確保する' },
            { svg: LABEL_ICON('#eafaf0', '#1f9d55', '#1f9d55', '可用性管理'), label: '可用性管理', desc: 'サービスが必要なときに利用可能な状態を維持する' },
            { svg: LABEL_ICON('#fff4e5', '#c9820a', '#c9820a', 'ファシリティ', 10), label: 'ファシリティマネジメント', desc: '電源・空調・入退室管理など物理的な設備環境を維持する' },
            { svg: LABEL_ICON('#f3e8ff', '#7c3aed', '#7c3aed', '財務管理'), label: '財務管理(ITFM)', desc: 'コストを把握し、予算編成や課金などを適切に行う' }
          ]
        },
        {
          type: 'table',
          headers: ['プロセス', '目的'],
          rows: [
            ['キャパシティ管理', '将来の業務量やシステム利用状況を予測し、必要な処理能力を適切な時期に確保する'],
            ['可用性管理', '合意したサービスレベルに基づき、ITサービスが必要なときに利用可能な状態を維持する'],
            ['ファシリティマネジメント', 'データセンタなどの設備において、電源・空調・入退室管理などの物理的な環境を維持・管理する'],
            ['財務管理(ITFM)', 'ITサービスの提供にかかるコストを把握し、予算編成や課金などを適切に行う']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「可用性管理」はサービスが止まらず稼働できる状態を維持すること、「キャパシティ管理」は必要な処理能力・容量を確保することが目的であり、どちらも安定稼働に関わるため混同しやすい。可用性管理は主に「止まらないこと(稼働率)」、キャパシティ管理は主に「十分な性能・容量があること」に着目していると整理するとよい。' }
      ]
    },
    {
      title: 'サービスデスクとエスカレーション',
      relatedExamples: '関連する出題例: 「利用者からの問い合わせや障害報告を一元的に受け付ける窓口を何と呼ぶか」「発生した問題を、対応できる範囲を超えた場合に、より高度な知識を持つ上位の担当者や部署に引き継ぐことを何と呼ぶか」「サービスデスクにおいて、利用者からの問い合わせのうち、技術的な問題解決を専門に扱う窓口を特に何と呼ぶことが多いか」など',
      blocks: [
        { type: 'paragraph', html: '利用者からの問い合わせ・障害報告・要望などを一元的に受け付ける窓口をサービスデスクという。サービスデスクは利用者にとっての単一窓口(シングルポイントオブコンタクト)として機能し、自身で解決できない内容は、より高度な知識を持つ上位の担当者や部署へ引き継ぐ。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="0" y="45" width="70" height="45" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="35" y="72" font-size="11" fill="#333" text-anchor="middle">利用者</text>

              <line x1="70" y1="67" x2="100" y2="67" stroke="#333" stroke-width="1.5"/>

              <rect x="100" y="30" width="130" height="75" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="165" y="55" font-size="11" fill="#2f5fe0" text-anchor="middle" font-weight="bold">サービスデスク</text>
              <text x="165" y="70" font-size="9" fill="#2f5fe0" text-anchor="middle">(一元窓口・一次対応)</text>
              <rect x="112" y="78" width="106" height="20" rx="4" fill="#eafaf0" stroke="#1f9d55" stroke-width="1.5"/>
              <text x="165" y="92" font-size="8" fill="#1f9d55" text-anchor="middle">うち技術対応=ヘルプデスク</text>

              <line x1="230" y1="67" x2="260" y2="67" stroke="#333" stroke-width="1.5"/>
              <text x="245" y="58" font-size="9" fill="#333" text-anchor="middle">解決できない場合</text>
              <text x="245" y="83" font-size="9" fill="#333" text-anchor="middle">エスカレーション</text>

              <rect x="260" y="45" width="150" height="45" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="335" y="63" font-size="10" fill="#c9820a" text-anchor="middle" font-weight="bold">上位の専門担当者</text>
              <text x="335" y="78" font-size="10" fill="#c9820a" text-anchor="middle" font-weight="bold">・部署(二次対応)</text>
            </svg>
          `,
          caption: '利用者からの問い合わせはまずサービスデスクが一元的に受け付ける。サービスデスクだけで解決できない場合は、より高度な知識を持つ上位の担当者・部署へエスカレーション(引き継ぎ)する。'
        },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['サービスデスク', '利用者からの問い合わせ・障害報告・要望などを一元的に受け付ける窓口機能'],
            ['ヘルプデスク', 'サービスデスク機能の中でも、特に技術的な問い合わせや問題解決を専門的に扱う窓口を指すことが多い'],
            ['エスカレーション', '担当者だけでは対応できない場合に、より高度な知識・権限を持つ上位の担当者・部署に引き継ぐこと']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'サービスデスクは技術的な問い合わせに限らず、利用者からのあらゆる問い合わせ・要望を受け付ける「総合窓口」である。これに対しヘルプデスクは、その中でも技術的な問題解決に特化した窓口を指すことが多い。両者を同一視しがちだが、対象範囲の広さが異なる点を押さえておく。' }
      ]
    },
    {
      title: 'ITサービス継続性管理と事業継続計画(BCP・RTO・RPO)',
      relatedExamples: '関連する出題例: 「災害などによってシステムが停止した際に、業務を早期に復旧させるための計画を何と呼ぶか」「障害発生時に、業務を再開させるまでに許容される最大の時間を表す指標を何と呼ぶか」「災害や障害の発生時に、どの時点の状態までデータを復旧させる必要があるかを表す指標を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '事業継続計画(BCP: Business Continuity Plan)は、災害や事故などの緊急事態が発生した際にも、重要な事業を中断させない、あるいは早期に復旧させるための方針・体制・手順を定めた計画である。このうちITサービスに関する部分を担うのがITサービス継続性管理であり、重要なITサービスを継続または早期に復旧できるよう、あらかじめ計画・準備を行う。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 430 170" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <line x1="20" y1="90" x2="410" y2="90" stroke="#333" stroke-width="2"/>
              <text x="415" y="94" font-size="10" fill="#333">時間</text>

              <line x1="120" y1="80" x2="120" y2="100" stroke="#1f9d55" stroke-width="2"/>
              <circle cx="120" cy="90" r="4" fill="#1f9d55"/>
              <text x="120" y="115" font-size="10" fill="#1f9d55" text-anchor="middle">直前の</text>
              <text x="120" y="128" font-size="10" fill="#1f9d55" text-anchor="middle">バックアップ</text>

              <line x1="240" y1="75" x2="240" y2="105" stroke="#d64545" stroke-width="2"/>
              <circle cx="240" cy="90" r="4" fill="#d64545"/>
              <text x="240" y="65" font-size="10" fill="#d64545" text-anchor="middle" font-weight="bold">障害発生</text>

              <line x1="330" y1="80" x2="330" y2="100" stroke="#2f5fe0" stroke-width="2"/>
              <circle cx="330" cy="90" r="4" fill="#2f5fe0"/>
              <text x="330" y="115" font-size="10" fill="#2f5fe0" text-anchor="middle">サービス</text>
              <text x="330" y="128" font-size="10" fill="#2f5fe0" text-anchor="middle">復旧</text>

              <line x1="120" y1="40" x2="240" y2="40" stroke="#1f9d55" stroke-width="2"/>
              <line x1="120" y1="35" x2="120" y2="45" stroke="#1f9d55" stroke-width="2"/>
              <line x1="240" y1="35" x2="240" y2="45" stroke="#1f9d55" stroke-width="2"/>
              <text x="180" y="30" font-size="10" fill="#1f9d55" text-anchor="middle" font-weight="bold">RPO(データ損失許容期間)</text>

              <line x1="240" y1="145" x2="330" y2="145" stroke="#2f5fe0" stroke-width="2"/>
              <line x1="240" y1="140" x2="240" y2="150" stroke="#2f5fe0" stroke-width="2"/>
              <line x1="330" y1="140" x2="330" y2="150" stroke="#2f5fe0" stroke-width="2"/>
              <text x="285" y="163" font-size="10" fill="#2f5fe0" text-anchor="middle" font-weight="bold">RTO(目標復旧時間)</text>
            </svg>
          `,
          caption: 'RPOは障害発生時点から見て「どの時点まで遡ってデータを復旧できればよいか」を表し、RTOは障害発生後「どれだけの時間でサービスを復旧できればよいか」を表す指標である。'
        },
        {
          type: 'table',
          headers: ['指標', '意味'],
          rows: [
            ['RTO(目標復旧時間, Recovery Time Objective)', '障害発生後、業務(サービス)を再開させるまでに許容される最大の時間'],
            ['RPO(目標復旧時点, Recovery Point Objective)', '災害や障害の発生時に、どの時点の状態までデータを復旧させる必要があるかを表す指標']
          ]
        },
        { type: 'example', label: '例題: RTOとRPOの考え方', html: 'あるシステムでRPOが24時間、RTOが4時間と定められているとする。深夜0時に取得した日次バックアップの後、翌日15時に障害が発生した場合、直前のバックアップ(0時時点)まで遡ってデータを復旧すれば、失われるデータは最大15時間分となりRPOの範囲内に収まる。また、障害発生(15時)から<strong>4時間以内(19時まで)</strong>にサービスを再開できれば、RTOの目標も達成したことになる。<strong>RPOは「どこまでデータを遡って復旧するか」、RTOは「復旧までどれだけ時間をかけられるか」という別々の軸の指標</strong>である点に注意する。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'RTOとRPOはどちらも「目標」を表す指標だが、RTOは障害発生後の「時間の長さ(いつまでに復旧するか)」、RPOは障害発生時点から見た「データの遡り具合(どの時点まで復旧するか)」を表しており、着目する軸が異なる。「時間(Time)のRTO」「データを戻す地点(Point)のRPO」と対応づけて覚えるとよい。' }
      ]
    },
    {
      title: 'システム運用管理(監視・バックアップ・ログ・パッチ管理)',
      relatedExamples: '関連する出題例: 「システムが正常に稼働しているかどうかを常時観測し、異常の予兆や障害を早期に検知する活動を何と呼ぶか」「バックアップしたデータを用いて、障害発生前の状態にシステムやデータを復元する操作を何と呼ぶか」「ソフトウェアの脆弱性を修正するために提供される更新プログラムを適用し、システムを最新の安全な状態に保つ管理活動を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'ITサービスを日々安定して提供するためには、システムの稼働状況を継続的に観測し、データを保護し、操作や作業の記録を残すといった、地道な日常運用管理が欠かせない。' },
        {
          type: 'iconGrid',
          items: [
            { svg: LABEL_ICON('#eef2ff', '#2f5fe0', '#2f5fe0', 'システム監視', 10), label: 'システム監視', desc: '稼働状況を常時観測し、異常の予兆や障害を早期に検知する' },
            { svg: LABEL_ICON('#eafaf0', '#1f9d55', '#1f9d55', 'バックアップ', 10), label: 'バックアップ/リストア', desc: '複製を取得しておき(バックアップ)、障害時に復元する(リストア)' },
            { svg: LABEL_ICON('#fff4e5', '#c9820a', '#c9820a', 'ログ'), label: 'ログ', desc: '操作履歴や障害発生状況を記録し、原因調査などに利用する' },
            { svg: LABEL_ICON('#f3e8ff', '#7c3aed', '#7c3aed', 'パッチ管理', 10), label: 'パッチ管理', desc: '脆弱性を修正する更新プログラムを適用し、安全な状態を保つ' },
            { svg: LABEL_ICON('#e6f7fa', '#0f8fa8', '#0f8fa8', 'ジョブ管理', 10), label: 'ジョブスケジューラ', desc: '定めたスケジュールに従いバッチ処理などを自動実行・管理する' }
          ]
        },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['システム監視', 'システムが正常に稼働しているかどうかを常時観測し、異常の予兆や障害を早期に検知する活動'],
            ['バックアップ', 'システム障害やデータ消失に備えて、データやシステムの複製をあらかじめ取得しておくこと'],
            ['リストア', 'バックアップしたデータを用いて、障害発生前の状態にシステムやデータを復元する操作'],
            ['ログ', 'システムの操作履歴や障害の発生状況などを時系列で記録したデータ。原因調査や不正アクセスの検知に利用する'],
            ['パッチ管理', 'ソフトウェアの脆弱性を修正する更新プログラム(パッチ)を適用し、システムを最新の安全な状態に保つ管理活動'],
            ['ジョブスケジューラ', 'あらかじめ定めたスケジュールに従って、バッチ処理などのジョブを自動的に実行・管理する仕組み']
          ]
        },
        { type: 'paragraph', html: 'システムの運用形態には、自社の設備内にサーバやシステムを保有し自ら運用する「オンプレミス」と、インターネット経由でリソースを利用する「クラウドサービス」がある。運用管理の負荷や初期投資、拡張性などの観点で、両者は対比して問われることが多い。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'バックアップは障害に備えて複製を「取得しておく」作業、リストアはその複製を使って「復元する」作業であり、方向(退避か復元か)が逆である点に注意する。また、パッチ管理(ソフトウェアの脆弱性修正)と構成管理(構成情報の記録)は、どちらもIT資産に関わる活動だが目的が異なるため混同しないようにする。' }
      ]
    }
  ]
};
