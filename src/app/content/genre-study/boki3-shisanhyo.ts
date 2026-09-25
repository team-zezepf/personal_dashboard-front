import { GenreContent } from '../../models/genre-content.models';

export const BOKI3_SHISANHYO_CONTENT: GenreContent = {
  examType: 'boki3',
  genreKey: 'shisanhyo',
  genreName: '試算表',
  category: '簿記3級',
  description: '試算表の意義と貸借平均の原理、合計試算表・残高試算表・合計残高試算表の違い、精算表の構造、そして試算表で発見できる誤りとできない誤りまでを図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '試算表の意義と貸借平均の原理',
      blocks: [
        { type: 'paragraph', html: '試算表とは、総勘定元帳に記録された各勘定科目の金額を一覧にまとめ、仕訳から元帳への転記が正しく行われているかを検証するために作成する表である。決算の前などに作成し、転記もれや金額の誤りがないかを確認する役割を持つ。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="13" text-anchor="middle">
                <rect x="10" y="50" width="100" height="40" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="60" y="74" fill="#2f5fe0" font-weight="bold">仕訳帳</text>
                <line x1="110" y1="70" x2="155" y2="70" stroke="#333" stroke-width="2"/>
                <text x="132" y="60" font-size="11" fill="#333">転記</text>
                <rect x="160" y="50" width="110" height="40" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="215" y="74" fill="#1f9d55" font-weight="bold">総勘定元帳</text>
                <line x1="270" y1="70" x2="305" y2="70" stroke="#333" stroke-width="2"/>
                <text x="287" y="60" font-size="11" fill="#333">集計</text>
                <rect x="310" y="50" width="100" height="40" rx="6" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
                <text x="360" y="74" fill="#7c3aed" font-weight="bold">試算表</text>
              </g>
            </svg>
          `,
          caption: '取引を仕訳帳に記録し、総勘定元帳の各勘定に転記したうえで、各勘定の金額を集計して試算表を作成する。'
        },
        { type: 'paragraph', html: '複式簿記では、1つの取引を必ず借方・貸方の両面に同じ金額で記入する。そのため、どれだけ多くの取引を記録しても、すべての勘定の借方合計金額と貸方合計金額は必ず一致する。この性質を<strong>貸借平均の原理</strong>といい、試算表によって転記の正確性を検証できる根拠となっている。' },
        {
          type: 'table',
          headers: ['借方残高', '勘定科目', '貸方残高'],
          rows: [
            ['150,000', '現金', ''],
            ['80,000', '売掛金', ''],
            ['', '買掛金', '40,000'],
            ['', '資本金', '100,000'],
            ['', '売上', '200,000'],
            ['110,000', '仕入', ''],
            ['340,000', '合計', '340,000']
          ]
        },
        {
          type: 'example',
          label: '例題: 貸借が一致することを確かめる',
          html: '上の残高試算表について、借方残高の合計は 150,000円+80,000円+110,000円=<strong>340,000円</strong>、貸方残高の合計は 40,000円+100,000円+200,000円=<strong>340,000円</strong>となり、両者は一致する。これは、どの取引も借方・貸方の両方に同じ金額を記入するため、元帳を勘定科目ごとに集計しなおしても貸借の合計は崩れない、という<strong>貸借平均の原理</strong>によるものである。'
        }
      ]
    },
    {
      title: '試算表の3種類(合計試算表・残高試算表・合計残高試算表)',
      blocks: [
        { type: 'paragraph', html: '試算表には集計の仕方によって3つの種類がある。それぞれ集計する金額が異なるだけで、もとになる元帳のデータは同じである。' },
        {
          type: 'table',
          headers: ['種類', '集計する金額', '特徴'],
          rows: [
            ['合計試算表', '各勘定の借方合計額・貸方合計額をそのまま集計', '借方合計は仕訳帳の借方合計と、貸方合計は仕訳帳の貸方合計と、それぞれ一致する'],
            ['残高試算表', '各勘定の借方・貸方の差額(残高)のみを集計', '各勘定の最終的な残高だけが分かり、財務諸表の作成につながりやすい'],
            ['合計残高試算表', '合計試算表と残高試算表を1つの表にまとめたもの', '借方残高・借方合計・貸方合計・貸方残高を1行で確認できる']
          ]
        },
        {
          type: 'table',
          headers: ['借方残高', '借方合計', '勘定科目', '貸方合計', '貸方残高'],
          rows: [
            ['150,000', '500,000', '現金', '350,000', ''],
            ['', '60,000', '買掛金', '100,000', '40,000']
          ]
        },
        {
          type: 'example',
          label: '例題: 合計試算表の借方合計は仕訳帳の借方合計と一致する',
          html: '合計試算表は、仕訳帳に記入された取引をそのまま勘定科目ごとに集計しなおしたものである。そのため合計試算表の借方合計金額は<strong>仕訳帳の借方合計金額</strong>と、貸方合計金額は<strong>仕訳帳の貸方合計金額</strong>と、それぞれ必ず一致する。'
        }
      ]
    },
    {
      title: '精算表',
      blocks: [
        { type: 'paragraph', html: '精算表は、試算表に決算整理(修正記入)を加えて損益計算書・貸借対照表を作成するまでの過程を1つの表にまとめたものである。決算手続きの全体像を一覧できるため、決算の下書きとしてよく利用される。' },
        { type: 'paragraph', html: '精算表は「試算表欄」「修正記入欄」「損益計算書欄」「貸借対照表欄」の4つの欄からなり、それぞれがさらに借方・貸方に分かれる。試算表欄の金額に修正記入欄の金額を加減し、収益・費用の勘定は損益計算書欄へ、資産・負債・資本の勘定は貸借対照表欄へ書き移していく。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 100" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <g font-size="12" text-anchor="middle">
                <rect x="10" y="10" width="95" height="26" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
                <text x="57.5" y="27" fill="#2f5fe0" font-weight="bold">試算表欄</text>
                <rect x="110" y="10" width="95" height="26" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
                <text x="157.5" y="27" fill="#c9820a" font-weight="bold">修正記入欄</text>
                <rect x="210" y="10" width="95" height="26" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="257.5" y="27" fill="#1f9d55" font-weight="bold">損益計算書欄</text>
                <rect x="310" y="10" width="100" height="26" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
                <text x="360" y="27" fill="#7c3aed" font-weight="bold">貸借対照表欄</text>

                <rect x="10" y="40" width="47.5" height="22" fill="#f7f9fb" stroke="#c7cdd6"/>
                <text x="33.75" y="55" font-size="11" fill="#333">借方</text>
                <rect x="57.5" y="40" width="47.5" height="22" fill="#f7f9fb" stroke="#c7cdd6"/>
                <text x="81.25" y="55" font-size="11" fill="#333">貸方</text>
                <rect x="110" y="40" width="47.5" height="22" fill="#f7f9fb" stroke="#c7cdd6"/>
                <text x="133.75" y="55" font-size="11" fill="#333">借方</text>
                <rect x="157.5" y="40" width="47.5" height="22" fill="#f7f9fb" stroke="#c7cdd6"/>
                <text x="181.25" y="55" font-size="11" fill="#333">貸方</text>
                <rect x="210" y="40" width="47.5" height="22" fill="#f7f9fb" stroke="#c7cdd6"/>
                <text x="233.75" y="55" font-size="11" fill="#333">借方</text>
                <rect x="257.5" y="40" width="47.5" height="22" fill="#f7f9fb" stroke="#c7cdd6"/>
                <text x="281.25" y="55" font-size="11" fill="#333">貸方</text>
                <rect x="310" y="40" width="50" height="22" fill="#f7f9fb" stroke="#c7cdd6"/>
                <text x="335" y="55" font-size="11" fill="#333">借方</text>
                <rect x="360" y="40" width="50" height="22" fill="#f7f9fb" stroke="#c7cdd6"/>
                <text x="385" y="55" font-size="11" fill="#333">貸方</text>

                <rect x="10" y="68" width="400" height="24" fill="#ffffff" stroke="#c7cdd6" stroke-dasharray="4 2"/>
                <rect x="210" y="68" width="47.5" height="24" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
                <text x="233.75" y="84" font-size="10" fill="#1f9d55">利益(差額)</text>
                <rect x="360" y="68" width="50" height="24" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
                <text x="385" y="84" font-size="10" fill="#7c3aed">当期純利益</text>
              </g>
            </svg>
          `,
          caption: '損益計算書欄で生じた差額(貸方の収益が借方の費用より大きい場合)は借方に記入して貸借を合わせ、同じ金額を貸借対照表欄の貸方に記入することで、貸借対照表欄も貸借が一致する。'
        },
        {
          type: 'example',
          label: '例題: 当期純利益はどこに記入されるか',
          html: '損益計算書欄で貸方(収益)の合計が借方(費用)の合計より大きいとき、その差額は<strong>当期純利益</strong>を意味する。損益計算書欄では差額を借方に記入して貸借を一致させ、貸借対照表欄では同じ金額を<strong>貸方</strong>に記入する。これは、利益が生じた分だけ資本(純資産)が増加したことを表すためである。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '損益計算書欄と貸借対照表欄とで、当期純利益を記入する側(借方・貸方)が逆になる点に注意する。損益計算書欄では<strong>借方</strong>に、貸借対照表欄では<strong>貸方</strong>に記入する。逆に当期純損失が生じた場合は、この記入する側がすべて反対になる。' }
      ]
    },
    {
      title: '試算表による検証とその限界',
      blocks: [
        { type: 'paragraph', html: '試算表を作成したときに借方合計と貸方合計が一致しない場合は、仕訳や転記のどこかに、借方・貸方のいずれか一方にだけ影響する誤り(記入もれや金額の書き間違いなど)が生じていると考えられる。試算表はこうした誤りを発見するために作成される。' },
        { type: 'paragraph', html: 'ただし、借方合計と貸方合計が一致したからといって、記帳にまったく誤りがないとは限らない。借方・貸方の両方に同じ影響を与える誤りは、貸借の金額そのものが崩れないため試算表では発見できない。これを<strong>試算表の限界</strong>という。' },
        {
          type: 'table',
          headers: ['誤りの例', '試算表で発見できるか'],
          rows: [
            ['取引の借方・貸方のどちらか一方だけを転記した(片側の記入もれ)', '発見できる(貸借が一致しなくなる)'],
            ['借方と貸方とで異なる金額を記入した(金額の誤記)', '発見できる(貸借が一致しなくなる)'],
            ['ある取引を借方・貸方ともに記入し忘れた(取引全体の記帳もれ)', '発見できない(貸借は一致したままになる)'],
            ['正しい金額・正しい貸借で、本来と異なる勘定科目に転記した', '発見できない(貸借は一致したままになる)'],
            ['ある取引の借方・貸方を取り違えて記入した(貸借の逆記入)', '発見できない(貸借の合計自体は変わらない)']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '試算表の貸借合計が一致していても、転記や仕訳に誤りがないとは限らない。<strong>取引全体の記帳もれ</strong>、<strong>勘定科目の書き間違い</strong>、<strong>貸借の逆記入</strong>などは、借方・貸方の金額そのものは変わらないため、試算表上では貸借が一致してしまい発見できない。「貸借が一致=誤りなし」と早合点しないこと。' }
      ]
    }
  ]
};
