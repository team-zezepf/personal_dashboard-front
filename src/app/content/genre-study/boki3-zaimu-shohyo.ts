import { GenreContent } from '../../models/genre-content.models';

export const BOKI3_ZAIMU_SHOHYO_CONTENT: GenreContent = {
  examType: 'boki3',
  genreKey: 'zaimu-shohyo',
  genreName: '財務諸表',
  category: '簿記3級',
  description: '貸借対照表と損益計算書という2つの決算書がそれぞれ何を表すのか、両者がどうつながっているのかを図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '貸借対照表(B/S)',
      blocks: [
        { type: 'paragraph', html: '貸借対照表(B/S: Balance Sheet)は、決算日などの<strong>一定時点</strong>における企業の財政状態、すなわち「何をどれだけ持っているか(資産)」「他人から調達した分(負債)」「自分のものといえる分(純資産)」を示す財務諸表である。左側に資産、右側に負債と純資産を並べ、両者の合計は必ず一致する。この関係を<strong>貸借対照表等式</strong>と呼ぶ。' },
        {
          type: 'formula',
          label: '貸借対照表等式',
          html: '資産 = 負債 + 純資産'
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 380 200" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g text-anchor="middle">
                <rect x="20" y="20" width="140" height="160" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="90" y="95" font-size="15" fill="#2f5fe0" font-weight="bold">資産</text>
                <text x="90" y="115" font-size="12" fill="#2f5fe0">1,000,000円</text>

                <rect x="220" y="20" width="140" height="80" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
                <text x="290" y="55" font-size="14" fill="#d64545" font-weight="bold">負債</text>
                <text x="290" y="74" font-size="12" fill="#d64545">500,000円</text>

                <rect x="220" y="100" width="140" height="80" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="290" y="135" font-size="14" fill="#1f9d55" font-weight="bold">純資産</text>
                <text x="290" y="154" font-size="12" fill="#1f9d55">500,000円</text>

                <text x="190" y="105" font-size="18" fill="#333" font-weight="bold">=</text>
              </g>
            </svg>
          `,
          caption: '資産の合計(左側)と、負債+純資産の合計(右側)は常に一致する。これが貸借対照表が「バランスシート」と呼ばれる理由である。'
        },
        {
          type: 'table',
          headers: ['部', '区分', '主な勘定科目'],
          rows: [
            ['資産の部', '流動資産', '現金、売掛金、商品 など'],
            ['資産の部', '固定資産', '建物、備品、土地 など'],
            ['負債の部', '流動負債', '買掛金、支払手形 など'],
            ['負債の部', '固定負債', '借入金(長期のもの) など'],
            ['純資産の部', '資本金・繰越利益剰余金', '株主からの出資額、過去からの利益の蓄積 など']
          ]
        },
        { type: 'paragraph', html: '資産・負債は、仕入→販売→代金回収という通常の営業サイクルに含まれるもの(現金・商品・売掛金・買掛金など)を流動資産・流動負債とする<sup>※</sup>。それ以外のもの(貸付金・借入金など)は、決算日の翌日から1年以内に現金化・決済されるかどうかで、流動資産・流動負債か固定資産・固定負債かを判定する。また、貸借対照表の資産は、現金化しやすいものから順に並べる<strong>流動性配列法</strong>で記載するのが一般的である。' },
        { type: 'paragraph', html: '<small>※このように営業サイクルを基準に流動/固定を判定する考え方を<strong>正常営業循環基準</strong>、期間(1年)を基準に判定する考え方を<strong>1年基準</strong>と呼ぶ。まず正常営業循環基準を優先して適用し、それに当てはまらないものにだけ1年基準を使う、という2段階の判定になっている。</small>' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 280" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <defs>
                <marker id="zsArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#c9820a"/>
                </marker>
              </defs>

              <rect x="10" y="14" width="180" height="46" rx="8" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="100" y="42" font-size="14" fill="#c9820a" text-anchor="middle" font-weight="bold">正常営業循環基準</text>

              <rect x="10" y="114" width="180" height="46" rx="8" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="100" y="142" font-size="14" fill="#c9820a" text-anchor="middle" font-weight="bold">1年基準</text>

              <rect x="10" y="204" width="230" height="50" rx="10" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="125" y="234" font-size="14" fill="#2f5fe0" text-anchor="middle" font-weight="bold">固定資産または固定負債</text>

              <rect x="250" y="14" width="180" height="146" rx="10" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="340" y="70" font-size="14" fill="#2f5fe0" text-anchor="middle" font-weight="bold">流動資産</text>
              <text x="340" y="90" font-size="14" fill="#2f5fe0" text-anchor="middle" font-weight="bold">または</text>
              <text x="340" y="110" font-size="14" fill="#2f5fe0" text-anchor="middle" font-weight="bold">流動負債</text>

              <line x1="190" y1="37" x2="248" y2="37" stroke="#c9820a" stroke-width="2.5" marker-end="url(#zsArrow)"/>
              <text x="220" y="26" font-size="11" fill="#555" text-anchor="middle">当てはまる</text>

              <line x1="190" y1="137" x2="248" y2="137" stroke="#c9820a" stroke-width="2.5" marker-end="url(#zsArrow)"/>
              <text x="220" y="126" font-size="11" fill="#555" text-anchor="middle">当てはまる</text>

              <line x1="100" y1="62" x2="100" y2="111" stroke="#c9820a" stroke-width="2.5" marker-end="url(#zsArrow)"/>
              <text x="112" y="90" font-size="11" fill="#555">当てはまらない</text>

              <line x1="100" y1="162" x2="100" y2="201" stroke="#c9820a" stroke-width="2.5" marker-end="url(#zsArrow)"/>
              <text x="112" y="185" font-size="11" fill="#555">当てはまらない</text>
            </svg>
          `,
          caption: 'まず正常営業循環基準に当てはまるかを判定し、当てはまらない場合のみ1年基準で判定する、という2段階のフロー。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '現金・売掛金・商品が流動資産なのは「1年以内に現金化されるから」ではなく、通常の営業サイクルに含まれるからである(正常営業循環基準、上記の※を参照)。「1年以内かどうか」で判定するのは、営業サイクルに含まれない貸付金・借入金などに限られる。また、資産の記載順序(流動性配列法)を負債・純資産の配列と混同しないこと。' }
      ]
    },
    {
      title: '損益計算書(P/L)',
      blocks: [
        { type: 'paragraph', html: '損益計算書(P/L: Profit and Loss Statement)は、貸借対照表とは異なり、<strong>一会計期間</strong>(通常は1年間)の収益と費用を集計し、その差額から企業の経営成績を明らかにする財務諸表である。収益合計から費用合計を差し引いた金額を当期純利益といい、費用が収益を上回る場合は当期純損失となる。' },
        {
          type: 'formula',
          label: '損益計算書の基本式',
          html: '収益 − 費用 = 当期純利益(マイナスなら当期純損失)'
        },
        {
          type: 'table',
          headers: ['区分', '主な勘定科目'],
          rows: [
            ['収益', '売上高 など'],
            ['費用', '売上原価(仕入)、給料、減価償却費、支払家賃、水道光熱費 など']
          ]
        },
        {
          type: 'example',
          label: '例題: 売上総利益と当期純利益の算定',
          html: '売上高1,000,000円、売上原価700,000円、給料150,000円、減価償却費30,000円の場合を考える。<br>売上総利益 = 売上高1,000,000円 − 売上原価700,000円 = <strong>300,000円</strong><br>費用合計 = 売上原価700,000円 + 給料150,000円 + 減価償却費30,000円 = 880,000円<br>当期純利益 = 収益1,000,000円 − 費用合計880,000円 = <strong>120,000円</strong>'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '売上総利益(粗利益)は「売上高−売上原価」で求める段階的な利益であり、給料や減価償却費などその他の費用を差し引く前の金額である。売上総利益をそのまま当期純利益と混同しないよう注意する。当期純利益は、収益合計から費用の全項目を差し引いた最終的な利益である。' }
      ]
    },
    {
      title: '純資産と当期純利益',
      blocks: [
        { type: 'paragraph', html: '損益計算書で計算された当期純利益は、その期の儲けを示すだけでなく、貸借対照表の純資産(資本)を増やす要素として反映される。この2つの決算書はそれぞれ独立した表ではなく、<strong>当期純利益を介してつながっている</strong>点が財務諸表を理解するうえでの要である。' },
        { type: 'paragraph', html: '株式会社の場合、純資産の部は株主が出資した金額を表す<strong>資本金</strong>と、これまでの利益の蓄積を表す<strong>繰越利益剰余金</strong>などに区分される。一方、個人企業(個人事業主)の場合は区分をせず、単に「資本」という1つの科目で純資産をまとめて表す。' },
        {
          type: 'formula',
          label: '個人企業における期末資本の計算式',
          html: '期末資本 = 期首資本 + 当期純利益 − 引出金'
        },
        {
          type: 'example',
          label: '例題: 個人企業の期末資本を求める',
          html: '期首資本500,000円、当期純利益80,000円、事業主が私的に引き出した引出金20,000円の場合、期末資本は次のように計算する。<br>期末資本 = 500,000円 + 80,000円 − 20,000円 = <strong>560,000円</strong>'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '当期純利益は損益計算書上の数値だが、それだけで完結するのではなく貸借対照表の純資産(資本)を増加させる形で反映される。この連携を忘れて2つの表を無関係なものとして覚えてしまうと、資本の増減を問う問題でつまずきやすい。また、個人企業の「引出金」は費用ではなく、資本の払い戻しとして資本を減少させる点(株式会社の配当に近い性質)にも注意する。' }
      ]
    }
  ]
};
