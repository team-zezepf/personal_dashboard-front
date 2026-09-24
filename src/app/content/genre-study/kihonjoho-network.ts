import { GenreContent } from '../../models/genre-content.models';

const DEVICE_SVG = (fill: string, stroke: string, textColor: string, label: string) => `
  <svg viewBox="0 0 100 60" width="100%" height="60">
    <rect x="10" y="10" width="80" height="40" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <text x="50" y="35" font-size="12" fill="${textColor}" text-anchor="middle" font-weight="bold">${label}</text>
  </svg>
`;

export const KIHONJOHO_NETWORK_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'network',
  genreName: 'ネットワーク',
  category: 'テクノロジ系',
  description: 'LAN/WANの基礎からTCP/IPの階層構造、IPアドレスとサブネット、代表的なプロトコル、ネットワーク機器、セキュリティまで、ネットワークで問われる要点を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: 'ネットワークの基礎(LAN/WANと接続形態)',
      relatedExamples: '関連する出題例: 「会社や家庭など、比較的狭い範囲内に構築されるネットワークを何と呼ぶか」「ネットワークの接続形態(トポロジ)として、正しいものはどれか」「送信データを一定の大きさに分割した単位を何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: 'ネットワークは規模によって分類され、会社や家庭など比較的狭い範囲を結ぶ「LAN(Local Area Network)」と、地理的に離れた拠点間を結ぶ「WAN(Wide Area Network)」に大別される。LAN同士やLANとWANを接続することで、より広い範囲との通信が可能になる。' },
        {
          type: 'table',
          headers: ['接続形態(トポロジ)', '特徴'],
          rows: [
            ['スター型', '集線装置(ハブ等)を中心に、各端末が個別の線で接続される形態。現在最も一般的。'],
            ['バス型', '1本の幹線(バスケーブル)に全端末を接続する形態。'],
            ['リング型', '端末を環状に接続し、データを順に受け渡す形態。'],
            ['メッシュ型', '端末同士を網目状に接続し、複数の経路を確保する形態。']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 230" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <line x1="200" y1="110" x2="200" y2="30" stroke="#333" stroke-width="2"/>
              <line x1="200" y1="110" x2="320" y2="110" stroke="#333" stroke-width="2"/>
              <line x1="200" y1="110" x2="200" y2="190" stroke="#333" stroke-width="2"/>
              <line x1="200" y1="110" x2="80" y2="110" stroke="#333" stroke-width="2"/>
              <rect x="165" y="85" width="70" height="50" rx="8" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="200" y="115" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">HUB</text>
              <rect x="165" y="5" width="70" height="35" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/>
              <text x="200" y="27" font-size="12" fill="#333" text-anchor="middle">PC1</text>
              <rect x="320" y="90" width="70" height="35" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/>
              <text x="355" y="112" font-size="12" fill="#333" text-anchor="middle">PC2</text>
              <rect x="165" y="190" width="70" height="35" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/>
              <text x="200" y="212" font-size="12" fill="#333" text-anchor="middle">PC3</text>
              <rect x="10" y="90" width="70" height="35" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/>
              <text x="45" y="112" font-size="12" fill="#333" text-anchor="middle">PC4</text>
            </svg>
          `,
          caption: 'スター型トポロジの例: 中央のハブ(集線装置)に各端末が個別のケーブルで接続される。1本のケーブル障害が他の端末に影響しにくい。'
        },
        { type: 'paragraph', html: '無線LAN(Wi-Fi)は、IEEE802.11シリーズとして標準化された無線通信を用いるLAN技術の総称であり、無線LANアクセスポイントを介して端末をネットワークに接続する。有線LANと組み合わせて利用されることが多い。' },
        { type: 'paragraph', html: 'ネットワーク上で送受信されるデータは、そのまま送るのではなく一定の大きさに分割される。この分割された単位を「パケット」と呼び、宛先情報などを記録した「ヘッダ」が付加される。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'データリンク層で扱う「フレーム」、ネットワーク層で扱う「パケット」、トランスポート層で扱う「セグメント」は、いずれも通信データの分割単位を指す言葉だが、扱う階層によって呼び方が異なるだけである。' }
      ]
    },
    {
      title: 'OSI参照モデルとTCP/IPの階層構造',
      relatedExamples: '関連する出題例: 「TCP/IPの階層モデルにおいて、トランスポート層に位置するプロトコルを、すべて選べ」「通信の信頼性を重視し、パケットの到達確認や再送制御を行うトランスポート層のプロトコルはどれか」など',
      blocks: [
        { type: 'paragraph', html: 'ネットワークの通信機能は役割ごとに階層化して整理される。代表的なモデルとして、通信機能を7つの層に分けるOSI参照モデルと、実際のインターネットで使われる4階層のTCP/IPモデルがある。' },
        {
          type: 'table',
          headers: ['層', '名称', '役割(例)'],
          rows: [
            ['第7層', 'アプリケーション層', '具体的な通信サービスを提供(HTTP, DNSなど)'],
            ['第6層', 'プレゼンテーション層', 'データ形式の変換・圧縮・暗号化'],
            ['第5層', 'セッション層', '通信の開始・終了(セッション)の管理'],
            ['第4層', 'トランスポート層', '端末間の信頼性確保(TCP, UDP)'],
            ['第3層', 'ネットワーク層', '経路選択・アドレッシング(IP)'],
            ['第2層', 'データリンク層', '隣接機器間のデータ転送(MACアドレス)'],
            ['第1層', '物理層', '電気信号・ケーブルなど物理的な伝送']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="10" width="250" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/>
              <text x="135" y="35" font-size="12" fill="#2f5fe0" text-anchor="middle">アプリケーション層</text>
              <text x="270" y="35" font-size="11" fill="#333">HTTP, HTTPS, DNS, DHCP</text>

              <rect x="10" y="55" width="250" height="40" fill="#eafaf0" stroke="#1f9d55" stroke-width="1.5"/>
              <text x="135" y="80" font-size="12" fill="#1f9d55" text-anchor="middle">トランスポート層</text>
              <text x="270" y="80" font-size="11" fill="#333">TCP, UDP</text>

              <rect x="10" y="100" width="250" height="40" fill="#fff4e5" stroke="#c9820a" stroke-width="1.5"/>
              <text x="135" y="125" font-size="12" fill="#c9820a" text-anchor="middle">インターネット層</text>
              <text x="270" y="125" font-size="11" fill="#333">IP, ICMP</text>

              <rect x="10" y="145" width="250" height="40" fill="#f3e8ff" stroke="#7c3aed" stroke-width="1.5"/>
              <text x="135" y="170" font-size="11" fill="#7c3aed" text-anchor="middle">ネットワークインタフェース層</text>
              <text x="270" y="170" font-size="11" fill="#333">Ethernet, Wi-Fi</text>
            </svg>
          `,
          caption: 'TCP/IPの4階層モデル。OSI参照モデルの上位3層(アプリケーション・プレゼンテーション・セッション)をまとめて「アプリケーション層」として扱う点が特徴。'
        },
        {
          type: 'table',
          headers: ['項目', 'TCP', 'UDP'],
          rows: [
            ['接続方式', 'コネクション型(事前に接続を確立)', 'コネクションレス型(確立なし)'],
            ['信頼性', '到達確認・再送制御・順序制御あり', '制御なし(信頼性より速度を優先)'],
            ['オーバーヘッド', '制御が多い分大きい', '小さく高速'],
            ['代表的な用途', 'Webページ閲覧(HTTP)、メール送受信など', '動画・音声配信、DNS問い合わせなど']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'HTTPはアプリケーション層、IPはネットワーク(インターネット)層のプロトコルであり、トランスポート層には分類されない。「どの層のプロトコルか」を問う設問では、各プロトコルの役割から階層を逆算できるようにしておく。' }
      ]
    },
    {
      title: 'IPアドレスとサブネットマスク',
      relatedExamples: '関連する出題例: 「IPv4におけるIPアドレスのビット長として、正しいものはどれか」「IPアドレス 192.168.1.0/26 のネットワークにおいて、ホストに割り当て可能なアドレスの最大数はどれか」「IPアドレスのうち、ネットワーク部とホスト部の境界を示すために用いられるものはどれか」など',
      blocks: [
        { type: 'paragraph', html: 'IPv4のIPアドレスは32ビットで構成され、8ビットずつ4つに区切って10進数で表記する(例: 192.168.1.1)。IPアドレスは「ネットワーク部」と「ホスト部」からなり、ネットワーク部は所属するネットワークを、ホスト部はそのネットワーク内の個々の機器を識別する。' },
        { type: 'paragraph', html: 'サブネットマスクは、IPアドレスのうちどこまでがネットワーク部でどこからがホスト部かという境界を示すために用いられる値である。ネットワーク部を1、ホスト部を0のビットで表し、IPアドレスと同じ32ビットで表記する。「/26」のように、ネットワーク部のビット数をそのまま後ろに付ける表記をCIDR表記と呼ぶ。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 90" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="0" y="15" width="260" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/>
              <text x="130" y="40" font-size="13" fill="#2f5fe0" text-anchor="middle">ネットワーク部(26ビット)</text>
              <rect x="260" y="15" width="140" height="40" fill="#eafaf0" stroke="#1f9d55" stroke-width="1.5"/>
              <text x="330" y="40" font-size="13" fill="#1f9d55" text-anchor="middle">ホスト部(6ビット)</text>
              <text x="0" y="75" font-size="11" fill="#7b8794">全32ビットのうち、サブネットマスクが示す位置で「ネットワーク部」と「ホスト部」に分かれる(例: /26)</text>
            </svg>
          `,
          caption: '192.168.1.0/26 の場合、32ビットのうち先頭26ビットがネットワーク部、残り6ビットがホスト部となる。'
        },
        { type: 'example', label: '例題: 192.168.1.0/26 で割り当て可能なホスト数', html: '「/26」はホスト部が 32-26=<strong>6ビット</strong>。アドレス総数は 2⁶=64個。そこから「ネットワークアドレス」と「ブロードキャストアドレス」の2個を除いた 64-2=<strong>62個</strong>がホストに割り当て可能な最大数となる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ホスト部が全て0のアドレスは「ネットワークアドレス」(ネットワークそのものを指す識別子)、全て1のアドレスは「ブロードキャストアドレス」(ネットワーク内全体への一斉送信用)であり、どちらも個々の機器には割り当てられない。ホスト数を求める際は必ずこの2個を引くことを忘れない。' },
        { type: 'paragraph', html: 'IPv4はアドレス空間が32ビット(約43億個)であり、インターネットの普及に伴いアドレスの枯渇が問題となった。この対策として、128ビットという非常に広大なアドレス空間を持つIPv6が策定されている。' }
      ]
    },
    {
      title: 'ネットワーク機器とルーティング',
      relatedExamples: '関連する出題例: 「社内LANとインターネットとの間でパケットを中継し、異なるネットワーク間の通信を実現する機器はどれか」「接続されている機器のMACアドレスを学習し、宛先の機器にのみデータを転送するLAN機器を何と呼ぶか」「自ネットワーク内の端末が、異なるネットワークへ通信する際に、最初にパケットを送信する中継機器のアドレスを何と呼ぶか」など',
      blocks: [
        {
          type: 'table',
          headers: ['機器', '主に扱う層', '役割'],
          rows: [
            ['リピータハブ', '物理層', '受信した信号を増幅し、宛先を区別せず全ポートへそのまま中継する'],
            ['スイッチングハブ', 'データリンク層', '接続機器のMACアドレスを学習し、宛先の機器にのみデータを転送する'],
            ['ルータ', 'ネットワーク層', '宛先IPアドレスをもとに、異なるネットワーク間でパケットを中継する']
          ]
        },
        {
          type: 'iconGrid',
          items: [
            { svg: DEVICE_SVG('#f7f9fb', '#c7cdd6', '#333', 'HUB'), label: 'リピータハブ', desc: '信号をそのまま全ポートへ中継' },
            { svg: DEVICE_SVG('#eef2ff', '#2f5fe0', '#2f5fe0', 'SW'), label: 'スイッチングハブ', desc: 'MACアドレスで宛先を判別' },
            { svg: DEVICE_SVG('#eafaf0', '#1f9d55', '#1f9d55', 'RT'), label: 'ルータ', desc: 'IPアドレスで経路を選択' }
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 220" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="20" width="70" height="40" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/>
              <text x="45" y="45" font-size="12" fill="#333" text-anchor="middle">PC1</text>
              <rect x="10" y="150" width="70" height="40" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/>
              <text x="45" y="175" font-size="12" fill="#333" text-anchor="middle">PC2</text>
              <line x1="80" y1="40" x2="140" y2="90" stroke="#333" stroke-width="2"/>
              <line x1="80" y1="170" x2="140" y2="120" stroke="#333" stroke-width="2"/>
              <rect x="140" y="80" width="90" height="50" rx="8" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="185" y="110" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">スイッチ</text>
              <line x1="230" y1="105" x2="290" y2="105" stroke="#333" stroke-width="2"/>
              <rect x="290" y="80" width="80" height="50" rx="8" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="330" y="110" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">ルータ</text>
              <line x1="370" y1="105" x2="400" y2="105" stroke="#333" stroke-width="2"/>
              <ellipse cx="410" cy="105" rx="26" ry="26" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="410" y="109" font-size="10" fill="#333" text-anchor="middle">Internet</text>
            </svg>
          `,
          caption: 'スイッチは同一ネットワーク(社内LAN)内の中継を、ルータは異なるネットワーク(社内LANとインターネット)間の中継を担う。'
        },
        { type: 'paragraph', html: '異なるネットワークセグメント間でパケットを中継する際、宛先IPアドレスをもとに最適な経路を選択する処理を「ルーティング」と呼ぶ。ルータはこのルーティングを行うことで、LANとインターネットのような異なるネットワーク同士の通信を実現する。' },
        { type: 'paragraph', html: '端末が自ネットワークの外(異なるネットワーク)へ通信する際、最初にパケットを送信する中継機器のアドレスを「デフォルトゲートウェイ」と呼ぶ。通常はルータのIPアドレスが設定される。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「ハブ(リピータハブ)」は同一セグメント内で信号をそのまま中継するだけで、異なるネットワークを繋ぐことはできない。異なるネットワーク間の接続・中継には必ず「ルータ」が必要になる、という区別が頻出のポイント。' }
      ]
    },
    {
      title: '代表的なアプリケーション層プロトコルとサービス',
      relatedExamples: '関連する出題例: 「ドメイン名とIPアドレスを相互に変換する仕組みを提供するサービスはどれか」「ネットワークに接続する端末に対して、IPアドレスなどの設定情報を自動的に割り当てる仕組みを何と呼ぶか」「HTTP通信にSSL/TLSによる暗号化を組み合わせ、通信内容を保護するプロトコルはどれか」など',
      blocks: [
        {
          type: 'table',
          headers: ['プロトコル', '主なポート番号', '役割'],
          rows: [
            ['HTTP', '80', 'Webページの送受信(平文)'],
            ['HTTPS', '443', 'SSL/TLSで暗号化したHTTP通信'],
            ['FTP', '20 / 21', 'ファイル転送'],
            ['SMTP', '25', 'メール送信'],
            ['DNS', '53', 'ドメイン名とIPアドレスの相互変換'],
            ['DHCP', '67 / 68', 'IPアドレスなどの自動割当て']
          ]
        },
        { type: 'paragraph', html: '1台のコンピュータ内では複数のアプリケーション(サービス)が同時に通信を行うことがある。これらを区別するためにTCP/IP通信で用いられる番号が「ポート番号」であり、例えばHTTPは80番、HTTPSは443番のように、プロトコルごとに標準的なポート番号が定められている。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 190" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="70" width="90" height="45" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/>
              <text x="55" y="97" font-size="12" fill="#333" text-anchor="middle">クライアント</text>

              <rect x="170" y="10" width="100" height="45" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="220" y="37" font-size="12" fill="#0f8fa8" text-anchor="middle">DNSサーバ</text>

              <line x1="100" y1="75" x2="170" y2="35" stroke="#333" stroke-width="1.5"/>
              <text x="90" y="60" font-size="10" fill="#333">①ドメイン名を問い合わせ</text>
              <line x1="170" y1="45" x2="100" y2="90" stroke="#333" stroke-width="1.5"/>
              <text x="90" y="128" font-size="10" fill="#333">②IPアドレスを応答</text>

              <rect x="300" y="70" width="110" height="45" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="355" y="97" font-size="12" fill="#2f5fe0" text-anchor="middle">Webサーバ</text>

              <line x1="100" y1="92" x2="300" y2="92" stroke="#333" stroke-width="1.5"/>
              <text x="150" y="145" font-size="10" fill="#333">③HTTP/HTTPSリクエスト(80/443番ポート)</text>
            </svg>
          `,
          caption: 'ブラウザはまずDNSサーバにドメイン名を問い合わせてIPアドレスを取得し(名前解決)、そのIPアドレス宛にHTTP/HTTPSでリクエストを送る。'
        },
        { type: 'paragraph', html: 'DNS(Domain Name System)は、人が覚えやすいドメイン名(例: example.com)と、通信に必要なIPアドレスとを相互に変換する仕組みである。' },
        { type: 'paragraph', html: 'DHCP(Dynamic Host Configuration Protocol)は、ネットワークに接続する端末に対してIPアドレスなどのネットワーク設定情報を自動的に割り当てる仕組みであり、端末ごとに手動で設定する手間を省くことができる。' },
        { type: 'paragraph', html: 'プロキシサーバは、クライアントの代理としてインターネット上のサーバへアクセスし、通信の中継やキャッシュの保持、アクセス制御などを行うサーバである。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'DNSは「名前解決(ドメイン名⇔IPアドレス)」、DHCPは「アドレス等の自動割当て」、NATは「アドレスの変換」と役割が似た用語が並ぶため混同しやすい。それぞれ「何を」「どう変換・割当てするか」で整理して区別する。' }
      ]
    },
    {
      title: 'ネットワークセキュリティ(暗号化方式とVPN)',
      relatedExamples: '関連する出題例: 「暗号化方式のうち、公開鍵暗号方式に分類されるものを、すべて選べ」「インターネットなどの公衆回線上に、暗号化技術を用いて仮想的な専用線のような通信経路を構築する技術を何と呼ぶか」など',
      blocks: [
        {
          type: 'table',
          headers: ['方式', '特徴', '代表例'],
          rows: [
            ['共通鍵暗号方式', '暗号化と復号に同じ鍵を使う。処理が高速だが、鍵の受け渡しに注意が必要。', 'AES, DES'],
            ['公開鍵暗号方式', '暗号化用(公開鍵)と復号用(秘密鍵)に異なる鍵を使う。鍵配送は安全だが処理が重い。', 'RSA, 楕円曲線暗号(ECC)']
          ]
        },
        { type: 'paragraph', html: 'HTTPSは、通信内容を保護するためにSSL/TLSと呼ばれる暗号化技術を利用しており、その内部では公開鍵暗号方式と共通鍵暗号方式が組み合わせて使われている。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 160" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="55" width="90" height="45" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/>
              <text x="55" y="82" font-size="12" fill="#333" text-anchor="middle">在宅端末</text>

              <ellipse cx="220" cy="77" rx="90" ry="45" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="220" y="82" font-size="13" fill="#c9820a" text-anchor="middle">インターネット</text>

              <rect x="340" y="55" width="90" height="45" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="385" y="78" font-size="11" fill="#2f5fe0" text-anchor="middle">社内</text>
              <text x="385" y="92" font-size="11" fill="#2f5fe0" text-anchor="middle">ネットワーク</text>

              <line x1="100" y1="77" x2="340" y2="77" stroke="#7c3aed" stroke-width="3" stroke-dasharray="8 4"/>
              <text x="130" y="30" font-size="11" fill="#7c3aed">暗号化されたVPNトンネル</text>
            </svg>
          `,
          caption: 'VPN(Virtual Private Network)は、インターネットなどの公衆回線上に暗号化技術を用いて仮想的な専用線のような通信経路を構築する技術であり、拠点間接続や在宅勤務時の社内ネットワーク接続などに利用される。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'AES・DESは「共通鍵暗号方式」、RSA・楕円曲線暗号(ECC)は「公開鍵暗号方式」に分類される。名称だけで覚えるのではなく、鍵が1つ(共通)か2つ(公開鍵・秘密鍵)かという構造で整理すると区別しやすい。' }
      ]
    }
  ]
};
