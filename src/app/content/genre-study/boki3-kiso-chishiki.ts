import { GenreContent } from '../../models/genre-content.models';

export const BOKI3_KISO_CHISHIKI_CONTENT: GenreContent = {
  examType: 'boki3',
  genreKey: 'kiso-chishiki',
  genreName: '基礎知識',
  category: '簿記3級',
  description: '複式簿記の考え方と、勘定科目を資産・負債・純資産・収益・費用の5つに分類する方法など、簿記を学ぶ上での土台となる基礎知識を解説します。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '複式簿記の考え方と借方・貸方',
      blocks: [
        { type: 'paragraph', html: '簿記とは、企業の取引を記録・計算し、財産や経営成績を明らかにするための技術である。現金の増減だけを記録する簡易な方法を単式簿記というのに対し、一つの取引を原因と結果の両面から捉え、「借方」と「貸方」の両方に記録する方法を複式簿記という。日商簿記検定で学ぶのはこの複式簿記である。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="180" y="20" font-size="14" fill="#333" text-anchor="middle" font-weight="bold">現金(勘定科目)</text>
              <line x1="20" y1="30" x2="340" y2="30" stroke="#333" stroke-width="2"/>
              <line x1="180" y1="30" x2="180" y2="170" stroke="#333" stroke-width="2"/>
              <rect x="20" y="35" width="160" height="30" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/>
              <text x="100" y="56" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">借方(左側)</text>
              <rect x="180" y="35" width="160" height="30" fill="#eafaf0" stroke="#1f9d55" stroke-width="1.5"/>
              <text x="260" y="56" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">貸方(右側)</text>
              <text x="100" y="120" font-size="12" fill="#333" text-anchor="middle">(取引の内容を</text>
              <text x="100" y="138" font-size="12" fill="#333" text-anchor="middle">左側に記入)</text>
              <text x="260" y="120" font-size="12" fill="#333" text-anchor="middle">(取引の内容を</text>
              <text x="260" y="138" font-size="12" fill="#333" text-anchor="middle">右側に記入)</text>
            </svg>
          `,
          caption: 'T字勘定は、勘定科目ごとに紙面を左右に分けて記録する形。左側を借方、右側を貸方と呼ぶ。どちらの側が「増加」を表すかは勘定科目の分類によって異なる(次の項目の表を参照)。'
        },
        { type: 'paragraph', html: '複式簿記では、一つの取引を借方・貸方の両方に同じ金額で記入する(これを仕訳という)。そのため、すべての取引を記録し終えた時点で、借方の合計金額と貸方の合計金額は必ず一致する。これを貸借平均の原理という。' }
      ]
    },
    {
      title: '勘定科目の5分類(資産・負債・純資産・収益・費用)',
      blocks: [
        { type: 'paragraph', html: '取引を記録する際に用いる項目を勘定科目という。すべての勘定科目は、資産・負債・純資産(資本)・収益・費用の5つのいずれかに分類される。この5分類と、それぞれ借方・貸方のどちら側が増加を表すのかを正しく理解することが、仕訳を学ぶ上での土台になる。' },
        {
          type: 'table',
          headers: ['分類', '増加する側', '主な勘定科目の例'],
          rows: [
            ['資産', '借方(左)', '現金・売掛金・備品 など'],
            ['負債', '貸方(右)', '買掛金・借入金 など'],
            ['純資産(資本)', '貸方(右)', '資本金 など'],
            ['収益', '貸方(右)', '売上・受取手数料 など'],
            ['費用', '借方(左)', '仕入・給料・支払家賃 など']
          ]
        },
        {
          type: 'example',
          label: '例題: 勘定科目を分類する',
          html: '「買掛金」「資本金」「現金」「売上」の4つの勘定科目は、それぞれ次のように分類される。<br>現金 → <strong>資産</strong> / 買掛金 → <strong>負債</strong> / 資本金 → <strong>純資産</strong> / 売上 → <strong>収益</strong><br>このように、名前だけで判断がつきにくい科目もあるため、代表的な勘定科目とその分類は一通り覚えておく必要がある。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '資産は借方(左)が増加、負債・純資産・収益は貸方(右)が増加というように、勘定科目の分類によって「借方・貸方のどちらが増加を表すか」が異なる。特に資産と負債は増加する側が逆になるため混同しやすい。例えば現金(資産)が増えたときは借方に記入するが、借入金(負債)が増えたときは貸方に記入する。' }
      ]
    }
  ]
};
