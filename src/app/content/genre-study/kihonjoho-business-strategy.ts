import { GenreContent } from '../../models/genre-content.models';

const LABEL_ICON = (fill: string, stroke: string, textColor: string, label: string) => `
  <svg viewBox="0 0 100 60" width="100%" height="60">
    <rect x="6" y="10" width="88" height="40" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <text x="50" y="35" font-size="12" fill="${textColor}" text-anchor="middle" font-weight="bold">${label}</text>
  </svg>
`;

export const KIHONJOHO_BUSINESS_STRATEGY_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'business-strategy',
  genreName: '経営戦略',
  category: 'ストラテジ系',
  description: 'SWOT分析やPPMなど経営環境を分析するフレームワーク、競争戦略・成長戦略の考え方、企業間提携やマーケティング・財務指標の基礎知識を整理しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '経営戦略の分析フレームワーク(SWOT分析・ファイブフォース分析・バリューチェーン分析)',
      relatedExamples: '関連する出題例: 「自社の強み・弱みといった内部環境と、機会・脅威といった外部環境を分析するフレームワークはどれか」「業界内の競合、新規参入の脅威、代替品の脅威、売り手・買い手の交渉力という5つの要因から業界の競争構造を分析するフレームワークを何と呼ぶか」「企業活動を、購買・製造・出荷・販売・サービスなどの一連の主要活動に分解し、どの活動で付加価値が生み出されているかを分析する手法を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '経営戦略を立案する前提として、自社を取り巻く外部環境や内部の経営資源を客観的に把握する必要がある。ここでは代表的な分析フレームワークを整理する。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 210" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="150" y="16" font-size="11" fill="#7b8794" text-anchor="middle" font-weight="bold">プラス要因</text>
              <text x="330" y="16" font-size="11" fill="#7b8794" text-anchor="middle" font-weight="bold">マイナス要因</text>
              <text x="30" y="72" font-size="11" fill="#7b8794" text-anchor="middle" font-weight="bold">内部環境</text>
              <text x="30" y="168" font-size="11" fill="#7b8794" text-anchor="middle" font-weight="bold">外部環境</text>

              <rect x="65" y="28" width="170" height="76" rx="8" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="150" y="62" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">強み(Strength)</text>
              <text x="150" y="82" font-size="10" fill="#2f5fe0" text-anchor="middle">自社の内部の長所</text>

              <rect x="245" y="28" width="170" height="76" rx="8" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="330" y="62" font-size="13" fill="#d64545" text-anchor="middle" font-weight="bold">弱み(Weakness)</text>
              <text x="330" y="82" font-size="10" fill="#d64545" text-anchor="middle">自社の内部の短所</text>

              <rect x="65" y="124" width="170" height="76" rx="8" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="150" y="158" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">機会(Opportunity)</text>
              <text x="150" y="178" font-size="10" fill="#1f9d55" text-anchor="middle">自社に有利な外部環境</text>

              <rect x="245" y="124" width="170" height="76" rx="8" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="330" y="158" font-size="13" fill="#c9820a" text-anchor="middle" font-weight="bold">脅威(Threat)</text>
              <text x="330" y="178" font-size="10" fill="#c9820a" text-anchor="middle">自社に不利な外部環境</text>
            </svg>
          `,
          caption: 'SWOT分析: 内部環境(強み・弱み)と外部環境(機会・脅威)を、自社にとってプラスかマイナスかの軸とあわせて整理するフレームワーク。'
        },
        {
          type: 'table',
          headers: ['5つの要因', '内容'],
          rows: [
            ['業界内の競合', '既存の競合企業同士の競争の激しさ'],
            ['新規参入の脅威', '新たに業界へ参入してくる企業の脅威'],
            ['代替品の脅威', '自社製品・サービスに代わる代替品の脅威'],
            ['売り手の交渉力', '原材料・部品などの供給者(仕入先)の交渉力'],
            ['買い手の交渉力', '製品・サービスを購入する顧客側の交渉力']
          ]
        },
        { type: 'paragraph', html: 'ファイブフォース分析は、業界の競争構造や収益性を「業界の外側」から分析するフレームワークである。一方、バリューチェーン分析(価値連鎖分析)は、企業活動を購買物流・製造・出荷物流・マーケティング/販売・サービスといった主活動と、それを支える支援活動(全社管理・人事/労務管理・技術開発・調達活動)に分解し、「自社の内側」のどの活動で付加価値(利益)が生み出されているかを分析する。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 175" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="0" y="10" width="370" height="32" rx="6" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="185" y="31" font-size="10" fill="#333" text-anchor="middle">支援活動: 全社管理・人事/労務管理・技術開発・調達活動</text>

              <rect x="0" y="66" width="68" height="50" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="34" y="86" font-size="10" fill="#2f5fe0" text-anchor="middle" font-weight="bold">購買物流</text>
              <text x="34" y="100" font-size="8" fill="#2f5fe0" text-anchor="middle">(調達)</text>

              <rect x="74" y="66" width="66" height="50" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="107" y="91" font-size="10" fill="#2f5fe0" text-anchor="middle" font-weight="bold">製造</text>

              <rect x="146" y="66" width="68" height="50" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="180" y="86" font-size="10" fill="#2f5fe0" text-anchor="middle" font-weight="bold">出荷物流</text>
              <text x="180" y="100" font-size="8" fill="#2f5fe0" text-anchor="middle">(配送)</text>

              <rect x="220" y="66" width="82" height="50" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="261" y="86" font-size="10" fill="#2f5fe0" text-anchor="middle" font-weight="bold">マーケティング</text>
              <text x="261" y="100" font-size="9" fill="#2f5fe0" text-anchor="middle">・販売</text>

              <rect x="308" y="66" width="62" height="50" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="339" y="91" font-size="10" fill="#2f5fe0" text-anchor="middle" font-weight="bold">サービス</text>

              <rect x="375" y="10" width="60" height="106" rx="6" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
              <text x="405" y="58" font-size="11" fill="#7c3aed" text-anchor="middle" font-weight="bold">利益</text>
              <text x="405" y="74" font-size="9" fill="#7c3aed" text-anchor="middle">(マージン)</text>

              <text x="217" y="145" font-size="10" fill="#7b8794" text-anchor="middle">主活動(購買物流〜サービス)が価値を積み上げ、支援活動がそれを下支えすることで利益が生まれる。</text>
            </svg>
          `,
          caption: 'バリューチェーン分析: 企業活動を主活動と支援活動に分解し、どこで付加価値(利益)が生まれているかを分析する。'
        },
        { type: 'paragraph', html: 'また、他社が容易にまねのできない、企業の中核となる独自の強み(技術力やノウハウなど)をコアコンピタンスと呼ぶ。バリューチェーン分析などで自社のどの活動が強みの源泉になっているかを把握することは、コアコンピタンスを見極めることにもつながる。' },
        { type: 'example', label: '例題: どのフレームワークを使うべきか', html: '「業界内の競合が激しく新規参入も相次いでいるため、この業界は全体的に儲けにくいのではないか」を検討したい場合は<strong>ファイブフォース分析</strong>(業界の競争構造・外部環境)が適している。一方、「自社の製造工程と物流工程のどちらでコストがかさみ、どちらで強みを発揮できているか」を検討したい場合は<strong>バリューチェーン分析</strong>(自社内部の活動の分解)が適している。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'SWOT分析は「内部環境+外部環境」の両方を扱う広いフレームワークであるのに対し、ファイブフォース分析は「業界の競争構造(外部環境)」に絞った分析、バリューチェーン分析は「自社内部の活動」に絞った分析である。分析の対象範囲(内部か外部か、自社か業界かの)違いを混同しないように注意する。' }
      ]
    },
    {
      title: '競争戦略の基本類型(コストリーダーシップ戦略・差別化戦略・集中戦略)',
      relatedExamples: '関連する出題例: 「企業が自社の強みを生かせる特定の市場(顧客層や地域など)に経営資源を集中させる戦略を何と呼ぶか」「業界内で競合他社よりも低いコストで製品・サービスを提供することにより、価格面での優位性を確立しようとする戦略を何と呼ぶか」「競合他社の製品・サービスにはない独自の価値(品質・機能・ブランドなど)を提供することで、優位性を確立しようとする戦略を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'マイケル・ポーターは、企業が競争優位を築くための基本戦略として、対象とする市場の広さと競争優位の源泉(コストか、独自性か)の組み合わせから、コストリーダーシップ戦略・差別化戦略・集中戦略の3つを提示した。' },
        {
          type: 'iconGrid',
          items: [
            { svg: LABEL_ICON('#eef2ff', '#2f5fe0', '#2f5fe0', 'コスト'), label: 'コストリーダーシップ戦略', desc: '業界内で最も低いコスト構造を実現し、価格面で優位に立つ' },
            { svg: LABEL_ICON('#eafaf0', '#1f9d55', '#1f9d55', '差別化'), label: '差別化戦略', desc: '品質・機能・ブランドなど独自の価値で価格以外の面で優位に立つ' },
            { svg: LABEL_ICON('#fff4e5', '#c9820a', '#c9820a', '集中'), label: '集中戦略', desc: '特定の市場セグメント(顧客層・地域など)に経営資源を集中する' },
            { svg: LABEL_ICON('#f3e8ff', '#7c3aed', '#7c3aed', 'ニッチ'), label: 'ニッチ戦略', desc: '大企業が参入しにくい小規模で特定の市場(隙間市場)に特化する' }
          ]
        },
        {
          type: 'table',
          headers: ['戦略', '対象とする市場の広さ', '競争優位の源泉'],
          rows: [
            ['コストリーダーシップ戦略', '業界全体(広い)', 'コストの低さ'],
            ['差別化戦略', '業界全体(広い)', '独自性・付加価値'],
            ['集中戦略', '特定のセグメント(狭い)', 'コストまたは独自性を特定市場に集中']
          ]
        },
        { type: 'example', label: '例題: 戦略の見分け方', html: '地域密着型の小さなパン店が、特定の地域の顧客層に絞って経営資源を集中させ、その地域で確固たる地位を築こうとしている場合、これは大企業と同じ土俵で戦わない<strong>集中戦略(ニッチ戦略)</strong>にあたる。一方、大手スーパーが大量仕入れによって業界最安値を実現しようとする場合は<strong>コストリーダーシップ戦略</strong>にあたる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '集中戦略は「対象市場を絞る」という範囲についての戦略であり、絞った市場の中でコストで勝負するか差別化で勝負するかはさらに選択の余地がある。「集中戦略=低価格戦略」と単純に思い込まないよう注意する。ニッチ戦略は、集中戦略のうち特に大企業との競合を避ける狙いを強調した呼び方と理解しておくとよい。' }
      ]
    },
    {
      title: '成長戦略(アンゾフの成長マトリクス・多角化戦略・プロダクトライフサイクル)',
      relatedExamples: '関連する出題例: 「『製品』と『市場』を、それぞれ『既存』と『新規』の軸で分類し、企業の成長の方向性を4つに整理したフレームワークを何と呼ぶか」「製品が市場に投入されてから、導入期・成長期・成熟期・衰退期という段階をたどるという考え方を何と呼ぶか」「既存の事業とは異なる新たな事業分野に進出し、事業の多角化を図る戦略を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'アンゾフの成長マトリクスは、「製品」と「市場」をそれぞれ「既存」「新規」の軸で分類し、企業がどの方向に成長していくかを4パターンに整理したフレームワークである。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 210" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="150" y="16" font-size="11" fill="#7b8794" text-anchor="middle" font-weight="bold">既存製品</text>
              <text x="330" y="16" font-size="11" fill="#7b8794" text-anchor="middle" font-weight="bold">新製品</text>
              <text x="30" y="72" font-size="11" fill="#7b8794" text-anchor="middle" font-weight="bold">既存市場</text>
              <text x="30" y="168" font-size="11" fill="#7b8794" text-anchor="middle" font-weight="bold">新市場</text>

              <rect x="65" y="28" width="170" height="76" rx="8" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="150" y="62" font-size="12" fill="#2f5fe0" text-anchor="middle" font-weight="bold">市場浸透戦略</text>
              <text x="150" y="80" font-size="9" fill="#2f5fe0" text-anchor="middle">既存製品を既存市場に</text>
              <text x="150" y="93" font-size="9" fill="#2f5fe0" text-anchor="middle">より深く浸透させる</text>

              <rect x="245" y="28" width="170" height="76" rx="8" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="330" y="62" font-size="12" fill="#1f9d55" text-anchor="middle" font-weight="bold">新製品開発戦略</text>
              <text x="330" y="80" font-size="9" fill="#1f9d55" text-anchor="middle">既存市場向けに</text>
              <text x="330" y="93" font-size="9" fill="#1f9d55" text-anchor="middle">新しい製品を投入する</text>

              <rect x="65" y="124" width="170" height="76" rx="8" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="150" y="158" font-size="12" fill="#c9820a" text-anchor="middle" font-weight="bold">新市場開拓戦略</text>
              <text x="150" y="176" font-size="9" fill="#c9820a" text-anchor="middle">既存製品を</text>
              <text x="150" y="189" font-size="9" fill="#c9820a" text-anchor="middle">新しい市場に展開する</text>

              <rect x="245" y="124" width="170" height="76" rx="8" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="330" y="158" font-size="12" fill="#d64545" text-anchor="middle" font-weight="bold">多角化戦略</text>
              <text x="330" y="176" font-size="9" fill="#d64545" text-anchor="middle">新製品を新市場に投入</text>
              <text x="330" y="189" font-size="9" fill="#d64545" text-anchor="middle">(最もリスクが大きい)</text>
            </svg>
          `,
          caption: 'アンゾフの成長マトリクス: 製品と市場の「既存/新規」の組み合わせにより、市場浸透・新製品開発・新市場開拓・多角化の4つの成長方向を整理する。'
        },
        { type: 'paragraph', html: '多角化戦略は、既存の事業とは異なる新たな製品・市場に進出することで、企業全体の成長やリスク分散を図る戦略である。製品・市場ともに未経験の領域に挑むため、4つの成長方向の中で最もリスクが大きい。' },
        {
          type: 'table',
          headers: ['段階', '特徴'],
          rows: [
            ['導入期', '製品が市場に投入された直後。認知度が低く、売上は少ない'],
            ['成長期', '製品が市場に浸透し、売上・利益が急速に拡大する'],
            ['成熟期', '市場が飽和し、売上の伸びが鈍化する。競争が激化しやすい'],
            ['衰退期', '需要が減少し、売上・利益が縮小していく']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'プロダクトライフサイクルは製品が「時間の経過とともにたどる段階」を表すのに対し、アンゾフの成長マトリクスは「製品と市場をどう広げるか」という成長の方向性を表す、目的の異なるフレームワークである。両者とも「4つに分類する」という共通点があるため混同しやすいが、軸の意味を区別して覚える。' }
      ]
    },
    {
      title: 'PPM(プロダクトポートフォリオマネジメント)',
      relatedExamples: '関連する出題例: 「プロダクトポートフォリオマネジメント(PPM)において、市場成長率・市場占有率がともに高い事業を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'PPM(プロダクトポートフォリオマネジメント)は、複数の事業・製品を抱える企業が、限られた経営資源(資金)をどの事業に配分すべきかを検討するためのフレームワークである。「市場成長率」と「市場占有率(市場シェア)」という2つの軸で各事業を4象限に分類する。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 210" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="150" y="16" font-size="11" fill="#7b8794" text-anchor="middle" font-weight="bold">市場占有率: 高</text>
              <text x="330" y="16" font-size="11" fill="#7b8794" text-anchor="middle" font-weight="bold">市場占有率: 低</text>
              <text x="30" y="68" font-size="10" fill="#7b8794" text-anchor="middle" font-weight="bold">市場成長率</text>
              <text x="30" y="81" font-size="10" fill="#7b8794" text-anchor="middle" font-weight="bold">:高</text>
              <text x="30" y="164" font-size="10" fill="#7b8794" text-anchor="middle" font-weight="bold">市場成長率</text>
              <text x="30" y="177" font-size="10" fill="#7b8794" text-anchor="middle" font-weight="bold">:低</text>

              <rect x="65" y="28" width="170" height="76" rx="8" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="150" y="62" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">花形(スター)</text>
              <text x="150" y="82" font-size="9" fill="#2f5fe0" text-anchor="middle">投資も収益も大きい主力候補</text>

              <rect x="245" y="28" width="170" height="76" rx="8" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="330" y="62" font-size="13" fill="#c9820a" text-anchor="middle" font-weight="bold">問題児</text>
              <text x="330" y="82" font-size="9" fill="#c9820a" text-anchor="middle">育成投資か撤退かの判断が必要</text>

              <rect x="65" y="124" width="170" height="76" rx="8" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="150" y="158" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">金のなる木</text>
              <text x="150" y="178" font-size="9" fill="#1f9d55" text-anchor="middle">投資は少なく資金を生み出す</text>

              <rect x="245" y="124" width="170" height="76" rx="8" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="330" y="158" font-size="13" fill="#d64545" text-anchor="middle" font-weight="bold">負け犬</text>
              <text x="330" y="178" font-size="9" fill="#d64545" text-anchor="middle">撤退を検討する対象</text>
            </svg>
          `,
          caption: 'PPM: 市場成長率と市場占有率の高低によって事業を4象限に分類する。「金のなる木」で生み出した資金を、将来性のある「花形」や「問題児」に再投資するのが基本的な考え方である。'
        },
        {
          type: 'table',
          headers: ['象限', '市場成長率', '市場占有率', '資金の流れ'],
          rows: [
            ['花形(スター)', '高い', '高い', '収益は大きいが、成長維持のための投資も必要'],
            ['金のなる木', '低い', '高い', '追加投資が少なく、安定して資金を生み出す'],
            ['問題児', '高い', '低い', '育成のための投資が必要。将来の花形候補'],
            ['負け犬', '低い', '低い', '資金創出力が乏しく、撤退が検討される']
          ]
        },
        { type: 'example', label: '例題: 象限の判定', html: '市場全体が急成長している分野に参入したばかりで、自社の市場シェアはまだ低い事業がある場合、この事業はPPM上の<strong>「問題児」</strong>に位置づけられる。ここで追加投資を行って「花形」に育てるか、見切りをつけるかが経営判断のポイントとなる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「花形」と「金のなる木」はどちらも市場占有率が高く収益を生む点で似ているが、花形は市場成長率も高いため成長維持のための投資が必要になる一方、金のなる木は市場成長率が低く追加投資をあまり必要としないため、資金の「出し手」として他の事業に回せる点が異なる。' }
      ]
    },
    {
      title: '企業間の提携・買収と経営改善の手法(M&A・TOB・アライアンス・フランチャイズ・ベンチマーキング)',
      relatedExamples: '関連する出題例: 「企業が他企業を合併・買収することにより、事業規模の拡大や新規事業への進出を図る手法を何と呼ぶか」「複数の企業が、互いの経営資源を活用し合いながら、資本の統合を伴わずに協力関係を築くことを何と呼ぶか」「自社の業務プロセスや製品を、優れた他社(業界のベスト企業など)と比較・分析し、改善に役立てる手法を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '企業は自社単独での成長だけでなく、他企業との関わり方によっても事業拡大や競争力強化を図る。他企業との関わり方は、資本の統合を伴うかどうかで大きく整理できる。' },
        {
          type: 'table',
          headers: ['手法・形態', '資本の統合', '概要'],
          rows: [
            ['M&A(合併・買収)', '伴う', '他企業を合併・買収し、事業規模の拡大や新規事業・市場への進出を図る'],
            ['TOB(株式公開買付け)', '伴う', '株式市場を通さず、買付価格・期間・株数を公告して株式を買い集める、M&Aの手段の一つ'],
            ['アライアンス(業務提携)', '伴わない', '複数の企業が経営資源(技術・販売網など)を互いに活用し合いながら協力関係を築く'],
            ['フランチャイズチェーン', '伴わない', '本部(フランチャイザー)が加盟店(フランチャイジー)に商標・ノウハウを提供し、対価としてロイヤリティを受け取る']
          ]
        },
        { type: 'paragraph', html: 'また、他社との資本関係とは別に、自社の業務プロセスや製品を業界のベスト企業など優れた他社と比較・分析し、自社の課題や改善点を明らかにする手法をベンチマーキングと呼ぶ。' },
        { type: 'example', label: '例題: 提携形態の見分け方', html: 'A社がB社の株式を買い集めて経営権を取得した場合は<strong>M&A</strong>(資本の統合を伴う)にあたる。一方、A社とC社が資本関係を持たないまま、互いの技術と販売網を持ち寄って共同で新製品を開発する場合は<strong>アライアンス(業務提携)</strong>(資本の統合を伴わない)にあたる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'TOBはM&Aと対立する別の概念ではなく、M&A(合併・買収)を実現するための具体的な手段の一つである。また、アライアンスやフランチャイズチェーンは資本の統合を伴わない協力関係である点で、M&A・TOBと明確に区別できる。' }
      ]
    },
    {
      title: 'マーケティング戦略(STP分析・マーケティングミックス4P・ブランド戦略・CRM)',
      relatedExamples: '関連する出題例: 「マーケティング戦略の立案において用いられる、製品(Product)・価格(Price)・流通(Place)・プロモーション(Promotion)の4つの要素を何と呼ぶか」「市場を細分化(セグメンテーション)し、狙う市場を選定(ターゲティング)した上で、自社製品の立ち位置を明確にする(ポジショニング)というマーケティングの分析手法を何と呼ぶか」「顧客との関係を管理し、顧客満足度の向上や売上拡大を図るための手法・システムを何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'マーケティング戦略は、一般に「誰に売るか」を定めるSTP分析と、「どう売るか」を具体化するマーケティングミックス(4P)の2段階で検討される。' },
        {
          type: 'table',
          headers: ['ステップ', '内容'],
          rows: [
            ['セグメンテーション(Segmentation)', '市場を年齢・地域・ニーズなどの基準で細分化する'],
            ['ターゲティング(Targeting)', '細分化した市場の中から、自社が狙う市場を選定する'],
            ['ポジショニング(Positioning)', '競合と比較した自社製品の立ち位置(強み・独自性)を明確にする']
          ]
        },
        {
          type: 'iconGrid',
          items: [
            { svg: LABEL_ICON('#eef2ff', '#2f5fe0', '#2f5fe0', 'Product'), label: '製品(Product)', desc: '品質・機能・デザインなど、提供する製品・サービスそのもの' },
            { svg: LABEL_ICON('#eafaf0', '#1f9d55', '#1f9d55', 'Price'), label: '価格(Price)', desc: '販売価格・割引・支払条件などの設定' },
            { svg: LABEL_ICON('#fff4e5', '#c9820a', '#c9820a', 'Place'), label: '流通(Place)', desc: '製品を顧客に届ける販売チャネル・流通経路' },
            { svg: LABEL_ICON('#f3e8ff', '#7c3aed', '#7c3aed', 'Promotion'), label: 'プロモーション(Promotion)', desc: '広告・販売促進・広報など顧客への訴求活動' }
          ]
        },
        { type: 'paragraph', html: 'このほか、企業や製品に対する顧客の信頼・イメージ・認知度といった無形の資産価値(ブランド価値)を高める活動をブランド戦略と呼ぶ。また、顧客に関する情報を一元管理し、顧客との関係を維持・強化することで顧客満足度の向上や売上拡大につなげる手法・システムをCRM(顧客関係管理)と呼ぶ。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'STP分析は「どの市場の、どの顧客を狙うか」を決める上流の検討であり、4P(マーケティングミックス)はターゲットが決まった後に「製品・価格・流通・プロモーションをどう組み合わせるか」を具体化する下流の検討である。両者の役割・順序を逆に覚えないよう注意する。' }
      ]
    },
    {
      title: '経営管理・評価の手法(バランススコアカード・損益分岐点・ROI・SCM)',
      relatedExamples: '関連する出題例: 「企業の業績を『財務』『顧客』『業務プロセス』『学習と成長』という4つの視点から総合的に評価する経営管理手法を何と呼ぶか」「ある商品の売上高が500万円、変動費が300万円、固定費が100万円である場合、損益分岐点売上高として正しいものはどれか」「投資額に対してどれだけの利益を得られたかを示す、投資効果を測る代表的な指標を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'バランススコアカード(BSC)は、企業の業績を「財務」「顧客」「業務プロセス」「学習と成長」という4つの視点から総合的に評価・管理する経営管理手法である。財務的な結果だけでなく、その結果を生み出す顧客対応・業務プロセス・人材育成などの視点もあわせて評価する点が特徴である。' },
        {
          type: 'table',
          headers: ['視点', '内容'],
          rows: [
            ['財務の視点', '売上・利益など、株主・企業にとっての財務的な成果'],
            ['顧客の視点', '顧客満足度・顧客からの評価'],
            ['業務プロセスの視点', '業務の効率性・品質など、社内プロセスの状態'],
            ['学習と成長の視点', '従業員の能力開発や組織としての学習・成長力']
          ]
        },
        { type: 'paragraph', html: '損益分岐点売上高は、利益も損失も出ない(利益がちょうど0になる)売上高である。売上高から変動費を差し引いたものを限界利益といい、売上高に対する限界利益の割合を限界利益率という。' },
        { type: 'formula', label: '公式: 損益分岐点売上高', html: '限界利益 = 売上高 − 変動費<br>限界利益率 = 限界利益 ÷ 売上高<br>損益分岐点売上高 = 固定費 ÷ 限界利益率' },
        { type: 'example', label: '例題: 損益分岐点売上高の計算', html: '売上高500万円、変動費300万円、固定費100万円のとき、限界利益は500万円−300万円=200万円、限界利益率は200万円÷500万円=0.4となる。よって損益分岐点売上高は固定費100万円÷限界利益率0.4=<strong>250万円</strong>である。' },
        {
          type: 'table',
          headers: ['指標・手法', '説明'],
          rows: [
            ['ROI(投資利益率)', '投資額に対して得られた利益の割合を示す、投資効果を評価する代表的な指標'],
            ['SCM(サプライチェーンマネジメント)', '原材料調達から製造・物流・販売に至る一連のプロセス全体を、企業間を超えて統合的に管理し、在庫削減やリードタイム短縮などの効率化を図る手法']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ROI(投資利益率)は「投資額」に対する利益の割合を示す指標であり、「自己資本」に対する利益の割合を示すROE(自己資本利益率)とは分母が異なる。名称が似ているため、何に対する利益率なのかを意識して区別する。' }
      ]
    }
  ]
};
