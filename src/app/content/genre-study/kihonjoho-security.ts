import { GenreContent } from '../../models/genre-content.models';

const LABEL_ICON = (fill: string, stroke: string, textColor: string, label: string) => `
  <svg viewBox="0 0 100 60" width="100%" height="60">
    <rect x="6" y="10" width="88" height="40" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <text x="50" y="35" font-size="12" fill="${textColor}" text-anchor="middle" font-weight="bold">${label}</text>
  </svg>
`;

export const KIHONJOHO_SECURITY_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'security',
  genreName: 'セキュリティ',
  category: 'テクノロジ系',
  description: '暗号方式・認証技術・代表的なサイバー攻撃とその対策など、セキュリティで問われる要点を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '暗号方式(共通鍵暗号方式・公開鍵暗号方式・ハイブリッド暗号)',
      relatedExamples: '関連する出題例: 「共通鍵暗号方式の特徴として、正しいものはどれか」「暗号化に用いる鍵と復号に用いる鍵が異なり、暗号化用の鍵を公開できる暗号方式を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '通信内容を第三者に読まれないようにするため、平文を暗号文に変換することを暗号化、暗号文を平文に戻すことを復号という。暗号化・復号に使う鍵の扱い方によって、共通鍵暗号方式と公開鍵暗号方式の2種類に大別される。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 170" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="165" y="8" width="90" height="34" rx="6" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
              <text x="210" y="30" font-size="12" fill="#7c3aed" text-anchor="middle" font-weight="bold">鍵K(共通)</text>
              <line x1="190" y1="42" x2="130" y2="80" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="3,3"/>
              <line x1="230" y1="42" x2="290" y2="80" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="3,3"/>

              <rect x="0" y="80" width="55" height="40" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="27" y="104" font-size="12" fill="#333" text-anchor="middle">平文</text>
              <line x1="55" y1="100" x2="90" y2="100" stroke="#333" stroke-width="1.5"/>

              <rect x="90" y="80" width="80" height="40" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="130" y="104" font-size="12" fill="#2f5fe0" text-anchor="middle" font-weight="bold">暗号化</text>
              <line x1="170" y1="100" x2="205" y2="100" stroke="#333" stroke-width="1.5"/>

              <rect x="205" y="80" width="60" height="40" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="235" y="104" font-size="12" fill="#333" text-anchor="middle">暗号文</text>
              <line x1="265" y1="100" x2="300" y2="100" stroke="#333" stroke-width="1.5"/>

              <rect x="300" y="80" width="80" height="40" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="340" y="104" font-size="12" fill="#1f9d55" text-anchor="middle" font-weight="bold">復号</text>
              <line x1="380" y1="100" x2="415" y2="100" stroke="#333" stroke-width="1.5"/>
              <text x="418" y="104" font-size="11" fill="#333" text-anchor="end">平文</text>

              <text x="27" y="140" font-size="11" fill="#7b8794" text-anchor="middle">送信者</text>
              <text x="340" y="140" font-size="11" fill="#7b8794" text-anchor="middle">受信者</text>
            </svg>
          `,
          caption: '共通鍵暗号方式: 暗号化と復号に同じ鍵Kを使う。処理は高速だが、送受信者間で鍵を安全に事前共有する必要がある(鍵配送問題)。'
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 170" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="85" y="8" width="100" height="34" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="135" y="30" font-size="11" fill="#1f9d55" text-anchor="middle" font-weight="bold">受信者の公開鍵</text>
              <line x1="135" y1="42" x2="130" y2="80" stroke="#1f9d55" stroke-width="1.5" stroke-dasharray="3,3"/>

              <rect x="285" y="8" width="100" height="34" rx="6" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="335" y="30" font-size="11" fill="#d64545" text-anchor="middle" font-weight="bold">受信者の秘密鍵</text>
              <line x1="335" y1="42" x2="340" y2="80" stroke="#d64545" stroke-width="1.5" stroke-dasharray="3,3"/>

              <rect x="0" y="80" width="55" height="40" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="27" y="104" font-size="12" fill="#333" text-anchor="middle">平文</text>
              <line x1="55" y1="100" x2="90" y2="100" stroke="#333" stroke-width="1.5"/>

              <rect x="90" y="80" width="80" height="40" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="130" y="104" font-size="12" fill="#2f5fe0" text-anchor="middle" font-weight="bold">暗号化</text>
              <line x1="170" y1="100" x2="205" y2="100" stroke="#333" stroke-width="1.5"/>

              <rect x="205" y="80" width="60" height="40" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="235" y="104" font-size="12" fill="#333" text-anchor="middle">暗号文</text>
              <line x1="265" y1="100" x2="300" y2="100" stroke="#333" stroke-width="1.5"/>

              <rect x="300" y="80" width="80" height="40" rx="6" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="340" y="104" font-size="12" fill="#d64545" text-anchor="middle" font-weight="bold">復号</text>
              <line x1="380" y1="100" x2="415" y2="100" stroke="#333" stroke-width="1.5"/>
              <text x="418" y="104" font-size="11" fill="#333" text-anchor="end">平文</text>

              <text x="27" y="140" font-size="11" fill="#7b8794" text-anchor="middle">送信者</text>
              <text x="340" y="140" font-size="11" fill="#7b8794" text-anchor="middle">受信者</text>
            </svg>
          `,
          caption: '公開鍵暗号方式: 送信者は受信者の「公開鍵」で暗号化する。復号できるのは対になる「秘密鍵」を持つ受信者だけであり、秘密鍵は本人以外に公開しない。'
        },
        {
          type: 'table',
          headers: ['方式', '鍵の関係', '鍵の配送', '処理速度'],
          rows: [
            ['共通鍵暗号方式', '暗号化・復号に同一の鍵を使う', '鍵を安全に事前共有する必要がある(鍵配送問題)', '比較的高速'],
            ['公開鍵暗号方式', '暗号化(公開鍵)と復号(秘密鍵)で異なる鍵を使う', '公開鍵は第三者に公開してよい', '共通鍵暗号方式より低速']
          ]
        },
        { type: 'paragraph', html: '実際の通信(TLS/SSLなど)では、両方式の長所を組み合わせた「ハイブリッド暗号方式」が使われる。データ本体は高速な共通鍵暗号方式で暗号化し、その共通鍵(セッション鍵)だけを公開鍵暗号方式で安全に受け渡す。' },
        { type: 'example', label: '例題: ハイブリッド暗号方式の流れ', html: '① 送信者はランダムな共通鍵(セッション鍵)を生成する。② データ本体をその共通鍵で暗号化する。③ 共通鍵自体を受信者の公開鍵で暗号化して送る。④ 受信者は自分の秘密鍵で共通鍵を復号し、その共通鍵でデータ本体を復号する。<strong>公開鍵暗号方式は鍵の受け渡しだけに使い、データ本体は高速な共通鍵暗号方式で処理する</strong>のがポイントである。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '公開鍵暗号方式では、送信者が受信者の公開鍵で暗号化し、受信者が自分の秘密鍵で復号する(秘密鍵は復号する側だけが持つ)。「どちらの鍵で暗号化するか」を逆に覚えやすいので注意する。' }
      ]
    },
    {
      title: 'デジタル署名とハッシュ関数',
      relatedExamples: '関連する出題例: 「電子文書の作成者が本人であることと、送信後に文書が改ざんされていないことを証明するために用いられる技術を何と呼ぶか」「入力されたデータから一定の長さの固定的な値(ハッシュ値)を生成する関数を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'ハッシュ関数は、入力データから固定長のハッシュ値(メッセージダイジェスト)を生成する関数である。同じ入力からは常に同じハッシュ値が得られる一方、ハッシュ値から元のデータを逆算することは極めて困難(一方向性)であり、パスワードの保管やデータの改ざん検知に利用される。' },
        {
          type: 'table',
          headers: ['用途', '説明'],
          rows: [
            ['パスワードの保管', 'パスワードそのものではなくハッシュ値を保存し、漏えい時の被害を軽減する'],
            ['改ざん検知', '送信前後のハッシュ値を比較し、データが変更されていないか確認する'],
            ['デジタル署名', '文書のハッシュ値を送信者の秘密鍵で暗号化(署名)し、本人性・完全性を証明する']
          ]
        },
        { type: 'paragraph', html: 'デジタル署名は、公開鍵暗号方式の鍵の使い方を「逆向き」に利用する技術である。送信者は文書のハッシュ値を自分の秘密鍵で暗号化(署名)し、文書とともに送る。受信者は送信者の公開鍵でその署名を復号し、自分で計算したハッシュ値と一致するか確認することで、本人性(なりすましでないこと)と完全性(改ざんされていないこと)を確認できる。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 210" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="0" y="18" font-size="12" fill="#7b8794" font-weight="bold">① 送信者: 署名の作成</text>
              <rect x="0" y="28" width="60" height="36" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="30" y="50" font-size="11" fill="#333" text-anchor="middle">文書</text>
              <line x1="60" y1="46" x2="95" y2="46" stroke="#333" stroke-width="1.5"/>
              <rect x="95" y="28" width="85" height="36" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="137" y="50" font-size="11" fill="#0f8fa8" text-anchor="middle" font-weight="bold">ハッシュ関数</text>
              <line x1="180" y1="46" x2="215" y2="46" stroke="#333" stroke-width="1.5"/>
              <rect x="215" y="28" width="70" height="36" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="250" y="50" font-size="11" fill="#333" text-anchor="middle">ハッシュ値</text>
              <line x1="285" y1="46" x2="320" y2="46" stroke="#333" stroke-width="1.5"/>
              <rect x="320" y="28" width="118" height="36" rx="6" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="379" y="50" font-size="10" fill="#d64545" text-anchor="middle" font-weight="bold">秘密鍵で暗号化=署名</text>

              <text x="0" y="102" font-size="12" fill="#7b8794" font-weight="bold">② 受信者: 署名の検証</text>
              <rect x="0" y="112" width="60" height="36" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="30" y="134" font-size="10" fill="#333" text-anchor="middle">受信文書</text>
              <line x1="60" y1="130" x2="95" y2="130" stroke="#333" stroke-width="1.5"/>
              <rect x="95" y="112" width="85" height="36" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="137" y="134" font-size="11" fill="#0f8fa8" text-anchor="middle" font-weight="bold">ハッシュ関数</text>
              <line x1="180" y1="130" x2="215" y2="130" stroke="#333" stroke-width="1.5"/>
              <rect x="215" y="112" width="70" height="36" rx="4" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="250" y="134" font-size="10" fill="#333" text-anchor="middle">ハッシュ値A</text>
              <line x1="250" y1="148" x2="250" y2="165" stroke="#333" stroke-width="1.5"/>

              <rect x="0" y="165" width="180" height="36" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="90" y="187" font-size="10" fill="#1f9d55" text-anchor="middle" font-weight="bold">署名を公開鍵で復号→ハッシュ値B</text>
              <line x1="180" y1="183" x2="215" y2="183" stroke="#333" stroke-width="1.5"/>
              <rect x="215" y="165" width="120" height="36" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="275" y="187" font-size="11" fill="#c9820a" text-anchor="middle" font-weight="bold">A=Bなら正当</text>
            </svg>
          `,
          caption: 'デジタル署名の検証: 受信文書から計算したハッシュ値Aと、署名を送信者の公開鍵で復号して得たハッシュ値Bが一致すれば、改ざんされておらず本人が作成したことが確認できる。'
        },
        { type: 'example', label: '例題: 署名が一致しない場合', html: '受信した文書が通信途中で改ざんされていた場合、受信者が計算するハッシュ値Aは元の文書のものと変わってしまう。一方、署名から得られるハッシュ値Bは送信時のまま変化しない。そのためAとBが一致せず、<strong>改ざんを検知できる</strong>。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ハッシュ関数は鍵を使わない一方向の変換であり、鍵を使って行う暗号化(復号可能)とは異なる。また、通常の公開鍵暗号(秘匿目的)が「公開鍵で暗号化→秘密鍵で復号」なのに対し、デジタル署名は逆に「秘密鍵で署名→公開鍵で検証」する点を混同しないよう注意する。' }
      ]
    },
    {
      title: '利用者認証の技術',
      relatedExamples: '関連する出題例: 「ID・パスワードによる認証に加えて、性質の異なる複数の要素を組み合わせて本人確認を行う方式は何か」「ログインのたびに異なる一回限り有効なパスワードを用いる仕組みを何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '利用者認証に用いる情報は、大きく「知識情報(本人だけが知っている情報)」「所持情報(本人だけが持っている物)」「生体情報(本人の身体的特徴)」の3種類に分類される。このうち異なる種類の要素を2つ以上組み合わせて本人確認を行う方式を多要素認証(MFA)と呼ぶ。' },
        {
          type: 'iconGrid',
          items: [
            { svg: LABEL_ICON('#eef2ff', '#2f5fe0', '#2f5fe0', '知識情報'), label: '知識情報', desc: 'パスワード・暗証番号など、本人の記憶' },
            { svg: LABEL_ICON('#eafaf0', '#1f9d55', '#1f9d55', '所持情報'), label: '所持情報', desc: 'ICカード・スマートフォンなど、本人の所持物' },
            { svg: LABEL_ICON('#fff4e5', '#c9820a', '#c9820a', '生体情報'), label: '生体情報', desc: '指紋・顔・虹彩など、身体的特徴' },
            { svg: LABEL_ICON('#f3e8ff', '#7c3aed', '#7c3aed', 'OTP'), label: 'ワンタイムパスワード', desc: 'ログインのたびに変わる使い捨てパスワード' }
          ]
        },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['多要素認証(MFA)', '知識・所持・生体など異なる種類の要素を組み合わせて認証する方式'],
            ['ワンタイムパスワード', 'ログインのたびに変化する一回限り有効なパスワード。盗聴・使い回しによる不正ログインのリスクを低減する'],
            ['シングルサインオン(SSO)', '一度の認証で複数のシステム・サービスを利用できるようにする仕組み(利便性の向上が目的)'],
            ['ゼロトラスト', '社内・社外を区別せず、あらゆる通信を信頼せず都度検証するという考え方']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '多要素認証は「異なる種類」の要素を組み合わせる方式であり、同じ種類の情報を2回聞く(例: パスワードを2回入力させる)ことは多要素認証にはあたらない。また、シングルサインオンは認証の「利便性」を高める仕組みであり、認証を「強化」するワンタイムパスワードや多要素認証とは目的が異なる点に注意する。' }
      ]
    },
    {
      title: '人や仕組みの隙を突く攻撃',
      relatedExamples: '関連する出題例: 「実在する組織や人物になりすまして...偽のWebサイトに誘導し、ID・パスワードなどを盗み取ろうとする攻撃を何と呼ぶか」「技術的な手段ではなく、人の心理的な隙や行動のミスにつけ込んで重要情報を盗み出す手法を総称して何と呼ぶか」「考えられるパスワードの組み合わせを総当たりで試す攻撃手法を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '情報セキュリティに対する攻撃には、技術的な脆弱性を突くものだけでなく、人の心理的な隙や行動のミスにつけ込むものもある。代表的な手口とその特徴を整理する。' },
        {
          type: 'table',
          headers: ['攻撃手法', '概要'],
          rows: [
            ['フィッシング', '実在する組織・人物になりすましたメールや偽のWebサイトで、ID・パスワードやクレジットカード情報をだまし取る'],
            ['ソーシャルエンジニアリング', '技術的手段ではなく、なりすまし・盗み見・電話での聞き出しなど、人の心理的な隙や行動のミスにつけ込んで情報を盗む手法の総称'],
            ['ブルートフォース攻撃(総当たり攻撃)', '考えられる文字の組み合わせを片っ端から試してパスワードを解析する'],
            ['ゼロデイ攻撃', 'ソフトウェアの脆弱性が発見されてから修正プログラム(パッチ)が提供されるまでの無防備な期間を狙う']
          ]
        },
        { type: 'example', label: '例題: フィッシングとソーシャルエンジニアリングの違い', html: '銀行を装った偽のメールからニセのログイン画面に誘導し、入力されたIDとパスワードを盗み取るのは<strong>フィッシング</strong>(なりすましメール・偽サイトという仕掛けを伴う)。一方、清掃員などになりすまして社内に侵入し、机の上のメモに書かれたパスワードを盗み見るのは<strong>ソーシャルエンジニアリング</strong>(技術を使わず人の隙を突く)である。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'フィッシングは「偽のWebサイトへ誘導する」という技術的な仕掛けを伴うのに対し、ソーシャルエンジニアリングは技術を使わず人間の心理・行動の隙を突く点で異なる。また、ブルートフォース攻撃(総当たり)と辞書攻撃(よく使われる単語のリストを試す)も混同しやすいので区別しておく。' }
      ]
    },
    {
      title: 'Webアプリケーションへの攻撃',
      relatedExamples: '関連する出題例: 「Webアプリケーションの入力欄に不正なSQL文を混入させることで、データベースを不正に操作する攻撃手法を何と呼ぶか」「脆弱性のあるWebサイトに悪意あるスクリプトを埋め込み、閲覧者のブラウザ上で実行させる攻撃手法を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'Webアプリケーションの入力欄に対するチェックが不十分だと、攻撃者が想定外のデータを送り込むことでシステムを不正に操作できてしまう。代表的な攻撃としてSQLインジェクションとクロスサイトスクリプティング(XSS)がある。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 130" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="0" y="45" width="80" height="44" rx="6" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="40" y="72" font-size="12" fill="#d64545" text-anchor="middle" font-weight="bold">攻撃者</text>
              <line x1="80" y1="67" x2="120" y2="67" stroke="#333" stroke-width="1.5"/>
              <text x="100" y="57" font-size="9" fill="#333" text-anchor="middle">' OR '1'='1</text>

              <rect x="120" y="45" width="110" height="44" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="175" y="63" font-size="11" fill="#2f5fe0" text-anchor="middle" font-weight="bold">Webアプリ</text>
              <text x="175" y="78" font-size="9" fill="#2f5fe0" text-anchor="middle">入力をそのままSQL文に結合</text>
              <line x1="230" y1="67" x2="270" y2="67" stroke="#333" stroke-width="1.5"/>

              <rect x="270" y="45" width="90" height="44" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="315" y="72" font-size="12" fill="#c9820a" text-anchor="middle" font-weight="bold">データベース</text>
              <line x1="360" y1="67" x2="400" y2="67" stroke="#333" stroke-width="1.5"/>

              <text x="405" y="55" font-size="9" fill="#333" text-anchor="middle">認証</text>
              <text x="405" y="68" font-size="9" fill="#333" text-anchor="middle">突破・</text>
              <text x="405" y="81" font-size="9" fill="#333" text-anchor="middle">情報漏えい</text>
            </svg>
          `,
          caption: 'SQLインジェクション: 入力欄の検証が不十分だと、攻撃者が送り込んだ文字列がSQL文の一部として実行され、想定外のデータベース操作(認証突破・情報漏えい・改ざん)を許してしまう。'
        },
        { type: 'example', label: '例題: SQLインジェクションによるログイン突破', html: 'ログインフォームのパスワード欄に「\' OR \'1\'=\'1」のような文字列を入力すると、Webアプリが組み立てるSQL文の条件式が常に真になってしまい、<strong>本来のパスワードを知らなくてもログインが成立してしまう</strong>ことがある。対策としては、入力値をそのままSQL文に埋め込まず、プレースホルダ(バインド機構)を使うなどの方法が有効である。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 150" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="0" y="10" width="80" height="40" rx="6" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="40" y="34" font-size="12" fill="#d64545" text-anchor="middle" font-weight="bold">攻撃者</text>
              <line x1="80" y1="30" x2="150" y2="30" stroke="#333" stroke-width="1.5"/>
              <text x="115" y="22" font-size="9" fill="#333" text-anchor="middle">悪意あるスクリプトを</text>
              <text x="115" y="46" font-size="9" fill="#333" text-anchor="middle">埋め込む</text>

              <rect x="150" y="10" width="120" height="40" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="210" y="34" font-size="11" fill="#c9820a" text-anchor="middle" font-weight="bold">脆弱なWebサイト</text>
              <line x1="210" y1="50" x2="210" y2="90" stroke="#333" stroke-width="1.5"/>
              <text x="250" y="74" font-size="9" fill="#333">閲覧</text>

              <rect x="150" y="90" width="120" height="40" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="210" y="106" font-size="10" fill="#2f5fe0" text-anchor="middle" font-weight="bold">閲覧者のブラウザ</text>
              <text x="210" y="122" font-size="9" fill="#2f5fe0" text-anchor="middle">スクリプトが実行される</text>

              <line x1="270" y1="105" x2="400" y2="55" stroke="#333" stroke-width="1.5"/>
              <text x="330" y="78" font-size="9" fill="#333">Cookie等を送信</text>
              <rect x="360" y="25" width="70" height="40" rx="6" fill="#fdeaea" stroke="#d64545" stroke-width="2"/>
              <text x="395" y="49" font-size="10" fill="#d64545" text-anchor="middle" font-weight="bold">攻撃者へ</text>
            </svg>
          `,
          caption: 'クロスサイトスクリプティング(XSS): 攻撃者が脆弱なサイトに悪意あるスクリプトを埋め込み、そのサイトを閲覧した利用者のブラウザ上でスクリプトを実行させて、Cookieなどの情報を盗み出す。'
        },
        {
          type: 'table',
          headers: ['攻撃', '実行される場所', '主な被害', '主な対策'],
          rows: [
            ['SQLインジェクション', 'Webサーバ側のデータベース', '不正なデータ閲覧・改ざん・削除、認証の突破', '入力値検証、プレースホルダ(バインド機構)の利用'],
            ['クロスサイトスクリプティング(XSS)', '閲覧者(利用者)のブラウザ側', 'Cookie等の情報窃取、なりすまし', '入力値のサニタイジング(エスケープ処理)']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'SQLインジェクションは「サーバ側」のデータベースで不正なSQLが実行されるのに対し、XSSは「閲覧者側」のブラウザで不正なスクリプトが実行される点で攻撃の対象が異なる。どちらも入力値のチェック(検証・無害化)が不十分なことが原因である点は共通している。' }
      ]
    },
    {
      title: 'マルウェア・DoS攻撃と防御技術',
      relatedExamples: '関連する出題例: 「コンピュータウイルスやマルウェアに分類されるものを、すべて選べ」「大量のデータや不正な要求をサーバに送りつけることで、サービスを提供できない状態に追い込む攻撃を何と呼ぶか」「内部ネットワークと外部ネットワークの境界に設置し、通信を許可・拒否する仕組みを何と呼ぶか」「ウイルス対策ソフトが既知のマルウェアを検知するために用いるデータを何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '利用者に害を及ぼす意図で作られたソフトウェアを総称してマルウェアと呼ぶ。マルウェアそのものではないが、外部からの不正アクセスやサービス妨害を防ぐための仕組みも合わせて理解しておく。' },
        {
          type: 'iconGrid',
          items: [
            { svg: LABEL_ICON('#fdeaea', '#d64545', '#d64545', 'ランサム'), label: 'ランサムウェア', desc: 'データを暗号化するなどして使用不能にし、復旧と引き換えに金銭を要求する' },
            { svg: LABEL_ICON('#fff4e5', '#c9820a', '#c9820a', 'ワーム'), label: 'ワーム', desc: '単独で自己増殖し、ネットワークを通じて他のコンピュータへ感染を広げる' },
            { svg: LABEL_ICON('#f3e8ff', '#7c3aed', '#7c3aed', '木馬'), label: 'トロイの木馬', desc: '無害なソフトウェアを装って侵入し、内部で不正な動作を行う' }
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="0" y="8" width="60" height="30" rx="4" fill="#fdeaea" stroke="#d64545" stroke-width="1.5"/>
              <text x="30" y="27" font-size="10" fill="#d64545" text-anchor="middle">攻撃者A</text>
              <rect x="0" y="55" width="60" height="30" rx="4" fill="#fdeaea" stroke="#d64545" stroke-width="1.5"/>
              <text x="30" y="74" font-size="10" fill="#d64545" text-anchor="middle">攻撃者B</text>
              <rect x="0" y="100" width="60" height="30" rx="4" fill="#fdeaea" stroke="#d64545" stroke-width="1.5"/>
              <text x="30" y="119" font-size="10" fill="#d64545" text-anchor="middle">攻撃者C</text>

              <line x1="60" y1="23" x2="180" y2="60" stroke="#d64545" stroke-width="1.5"/>
              <line x1="60" y1="70" x2="180" y2="65" stroke="#d64545" stroke-width="1.5"/>
              <line x1="60" y1="115" x2="180" y2="70" stroke="#d64545" stroke-width="1.5"/>
              <text x="120" y="48" font-size="10" fill="#d64545">大量の要求</text>

              <rect x="180" y="45" width="90" height="40" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="225" y="70" font-size="12" fill="#c9820a" text-anchor="middle" font-weight="bold">サーバ</text>

              <line x1="270" y1="65" x2="330" y2="65" stroke="#333" stroke-width="1.5" stroke-dasharray="3,3"/>
              <text x="300" y="58" font-size="9" fill="#333" text-anchor="middle">応答不能</text>
              <rect x="330" y="45" width="80" height="40" rx="6" fill="#f7f9fb" stroke="#c7cdd6"/>
              <text x="370" y="70" font-size="10" fill="#333" text-anchor="middle">正規利用者</text>
            </svg>
          `,
          caption: 'DoS攻撃: 大量のデータや不正な要求を送りつけてサーバの処理能力・回線容量を圧迫し、正規の利用者がサービスを利用できない状態に追い込む。'
        },
        {
          type: 'table',
          headers: ['防御の仕組み', '役割'],
          rows: [
            ['ファイアウォール', '内部ネットワークと外部ネットワークの境界に設置し、あらかじめ定めた規則に基づいて通信を許可・拒否する'],
            ['ウイルス対策ソフト', '既知のマルウェアの特徴をまとめたウイルス定義ファイル(パターンファイル)と照合してマルウェアを検知・駆除する'],
            ['VPN', 'インターネットなどの公衆回線上に、暗号化した仮想的な専用線を構築して安全に通信する'],
            ['プロキシサーバ', '内部の端末に代わって外部と通信を中継し、アクセス制御やキャッシュなどを行う']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ファイアウォールは「通信の可否」をルールに基づいて判断する仕組みであり、マルウェア自体を検知するものではない。マルウェアの検知・駆除にはウイルス対策ソフト(ウイルス定義ファイルとの照合)が必要であり、両者は役割が異なる。また、ファイアウォール自体はランサムウェアやワームのような「マルウェア」には分類されない点にも注意する。' }
      ]
    }
  ]
};
