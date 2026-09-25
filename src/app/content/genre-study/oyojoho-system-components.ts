import { GenreContent } from '../../models/genre-content.models';

export const OYOJOHO_SYSTEM_COMPONENTS_CONTENT: GenreContent = {
  examType: 'oyojoho',
  genreKey: 'system-components',
  genreName: 'システム構成要素',
  category: 'テクノロジ系',
  description: '稼働率計算(直列・並列構成、MTBF/MTTRからの算出と複数段の組み合わせ)、デュアルシステム・デュプレックスシステムやホット/ウォーム/コールドスタンバイといった待機系による冗長化、RAIDによるディスクの冗長化とロードバランサによる負荷分散など、システム構成要素で問われる可用性設計と計算問題の考え方を解説します。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '稼働率の計算:直列・並列システムとMTBF/MTTR',
      relatedExamples: '関連する出題例: 「稼働率0.9の装置を直列に2台接続したシステム全体の稼働率はいくつか」「稼働率0.9の装置を並列(冗長構成)に2台接続したシステム全体の稼働率はいくつか」など',
      blocks: [
        { type: 'paragraph', html: '稼働率とは、システムが正常に稼働している時間の割合を表す指標である。応用情報技術者試験では、稼働率そのものをMTBF・MTTRから求めさせたうえで、それを直列・並列に組み合わせたシステム全体の稼働率を計算させる、複合的な出題が中心となる。' },
        { type: 'formula', label: '稼働率の基本式', html: '稼働率 = MTBF ÷ (MTBF + MTTR)<br>(MTBF: 平均故障間隔、MTTR: 平均修理時間)' },
        { type: 'formula', label: '直列システムの稼働率', html: '複数の装置を直列に接続した構成では、すべての装置が稼働していないとシステム全体は稼働しない。<br>稼働率 = A₁ × A₂ × …' },
        { type: 'formula', label: '並列システムの稼働率', html: '複数の装置を並列(冗長構成)に接続した構成では、少なくとも1台が稼働していればシステムは稼働する。<br>稼働率 = 1 - (1-A₁) × (1-A₂) × …' },
        { type: 'example', label: '例題: MTBF・MTTRから稼働率を求める', html: 'ある装置のMTBFが450時間、MTTRが50時間であるとき、稼働率は 450 ÷ (450+50) = 450 ÷ 500 = <strong>0.9</strong>となる。この0.9という値を、以降の直列・並列計算の入力値として用いる。' },
        { type: 'example', label: '例題: 直列システムの稼働率', html: '稼働率0.9の装置を直列に2台接続したシステム全体の稼働率は、0.9 × 0.9 = <strong>0.81</strong>となる。直列構成では装置を追加するほど、システム全体の稼働率はかえって下がっていく点に注意する。' },
        { type: 'example', label: '例題: 並列(冗長)システムの稼働率', html: '稼働率0.9の装置を並列(冗長構成)に2台接続したシステム全体の稼働率は、1 - (1-0.9) × (1-0.9) = 1 - 0.1 × 0.1 = 1 - 0.01 = <strong>0.99</strong>となる。並列構成では装置を追加するほど、システム全体の稼働率は単体より高くなる。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="85" y="15" font-size="11" fill="#1f9d55" text-anchor="middle" font-weight="bold">並列(冗長化)</text>
              <line x1="10" y1="80" x2="40" y2="50" stroke="#333" stroke-width="2"/>
              <line x1="10" y1="80" x2="40" y2="110" stroke="#333" stroke-width="2"/>
              <rect x="40" y="35" width="90" height="30" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="85" y="55" font-size="10" fill="#1f9d55" text-anchor="middle">Webサーバ(0.9)</text>
              <rect x="40" y="95" width="90" height="30" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/><text x="85" y="115" font-size="10" fill="#1f9d55" text-anchor="middle">Webサーバ(0.9)</text>
              <line x1="130" y1="50" x2="160" y2="80" stroke="#333" stroke-width="2"/>
              <line x1="130" y1="110" x2="160" y2="80" stroke="#333" stroke-width="2"/>
              <text x="145" y="145" font-size="10" fill="#333" text-anchor="middle">稼働率0.99</text>
              <line x1="160" y1="80" x2="210" y2="80" stroke="#333" stroke-width="2"/>
              <text x="285" y="15" font-size="11" fill="#2f5fe0" text-anchor="middle" font-weight="bold">直列</text>
              <rect x="210" y="55" width="110" height="50" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/><text x="265" y="85" font-size="11" fill="#2f5fe0" text-anchor="middle">DBサーバ(0.9)</text>
              <line x1="320" y1="80" x2="360" y2="80" stroke="#333" stroke-width="2"/>
              <text x="380" y="85" font-size="10" fill="#333" text-anchor="middle">出力</text>
            </svg>
          `,
          caption: '並列化したWebサーバ群(稼働率0.99)の後段に、単一のDBサーバ(稼働率0.9)が直列に接続された構成。全体の稼働率は各部分の稼働率を掛け合わせて求める。'
        },
        { type: 'example', label: '応用例題: 並列と直列を組み合わせた場合', html: '上図のように、稼働率0.9のWebサーバ2台を並列(冗長構成)にした部分(稼働率0.99、前述の例題より)の後段に、稼働率0.9のDBサーバ1台を直列に接続する。システム全体の稼働率は、0.99 × 0.9 = <strong>0.891</strong>となる。さらにDBサーバも稼働率0.9の装置2台による冗長構成にすると、DB側の稼働率は 1 - (1-0.9)×(1-0.9) = 0.99 となり、システム全体は 0.99 × 0.99 = <strong>0.9801</strong>まで向上する。冗長化していない箇所(単一障害点)が1つでも直列に残っていると、そこがシステム全体の稼働率のボトルネックになることがわかる。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'MTBFとMTTRを分子・分母で取り違えやすい。稼働率の分子は「正常に動いていた時間」を表すMTBFである。また、直列は「両方とも必要」なのでそのまま掛け算、並列は「どちらか一方でよい」ので「両方とも故障している確率」(1-A₁)×(1-A₂)を1から引く、という手順を混同しないこと。複数段の構成では、まず並列部分をひとまとめの稼働率に計算してから、直列部分と掛け合わせる順序で解くとよい。' }
      ]
    },
    {
      title: '待機系による冗長化:デュアルシステム・デュプレックスシステムとフェールオーバー',
      relatedExamples: '関連する出題例: 「現用系のサーバが故障した際に、待機系のサーバへ自動的に処理を引き継ぐ仕組みを何と呼ぶか」など',
      blocks: [
        { type: 'paragraph', html: '複数のシステムを組み合わせて可用性を高める方式は、両系統を同時に稼働させ続けるか、一方を待機させておくかによって大きく2つに分けられる。さらに待機系をどこまで稼働させておくかによって、切替速度とコストのバランスが変わる。' },
        {
          type: 'table',
          headers: ['用語', '説明'],
          rows: [
            ['デュアルシステム', '同じ処理を行う2系統のシステムを常に同時に稼働させ、互いの処理結果を照合しながら運用する方式。片方に障害が発生してももう一方の結果で運用を継続できるため信頼性は非常に高いが、常に2系統分のリソースを稼働させ続けるためコストが高い'],
            ['デュプレックスシステム', '現用系(主系)と待機系(従系)に分け、普段は現用系のみで処理を行い、障害発生時に待機系へ切り替える方式。待機系をどこまで稼働させておくかにより、ホット/ウォーム/コールドスタンバイに分類される'],
            ['ホットスタンバイ', '待機系にもOS・アプリケーションを常時起動させ、データも現用系と同期させておく方式。切替時間は最も短いが、待機系分のランニングコストがかかる'],
            ['ウォームスタンバイ', '待機系のOSは起動させているがアプリケーションは起動させていない(または最小限のみ)状態で待機させる方式。ホットスタンバイより切替に時間がかかるが、コストは抑えられる'],
            ['コールドスタンバイ', '待機系の電源を入れず、障害発生時に起動・設定を行ってから切り替える方式。切替には最も時間がかかるが、待機系の運用コストは最小限で済む'],
            ['フェールオーバー', '現用系の障害を自動的に検知し、待機系へ処理を切り替える仕組み'],
            ['フェイルバック', '障害から復旧した後、切り替えた待機系から元の現用系へ処理を戻すこと']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'デュアルシステムとデュプレックスシステムを混同しやすい。デュアルシステムは「2系統が常に同時に処理する」のに対し、デュプレックスシステムは「1系統だけが処理し、もう一方は待機する」構成であり、待機系という概念が存在するのはデュプレックスシステムの方である。また、ホット→ウォーム→コールドの順に「切替は速いがコストは高い」「切替は遅いがコストは低い」というトレードオフになっている点で覚えるとよい。フェールオーバー(障害時に切り替える動作)とフェイルバック(復旧後に元に戻す動作)も方向が逆であるため混同しないこと。' }
      ]
    },
    {
      title: 'ストレージの冗長化(RAID)と負荷分散によるシステム構成',
      relatedExamples: '関連する出題例: 「複数台のディスクにデータとパリティ情報を分散して書き込むことで、1台のディスクが故障してもデータを復旧できる構成はどれか」「複数のサーバに処理を分散させ、特定のサーバへの負荷集中を防ぐとともに可用性を高める装置・仕組みはどれか」など',
      blocks: [
        { type: 'paragraph', html: 'ディスク単体の故障に備える仕組みがRAID(Redundant Arrays of Inexpensive Disks)であり、複数のディスクを組み合わせて冗長性や性能を高める。また、複数のサーバへ処理を振り分けるロードバランサは、負荷分散だけでなく可用性の向上にも寄与する。' },
        {
          type: 'table',
          headers: ['方式', '仕組み', '耐障害性', '実効容量(n台構成時)'],
          rows: [
            ['RAID0(ストライピング)', 'データを複数ディスクに分散して書き込み、読み書きを高速化する', '冗長性なし(1台故障で全データ喪失)', 'n台分'],
            ['RAID1(ミラーリング)', '同じデータを2台のディスクに複製して書き込む', '1台まで(2台構成)', '1台分(50%)'],
            ['RAID5', 'データとパリティ(誤り訂正情報)を複数ディスクに分散配置する(最小3台)', '1台まで', '(n-1)台分'],
            ['RAID6', 'RAID5を拡張し、2種類のパリティを分散配置する(最小4台)', '2台まで', '(n-2)台分'],
            ['JBOD', '複数ディスクを単純に連結し、1つの大きな領域として扱う', '冗長性なし', 'n台分']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 380 170" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="190" y="15" font-size="12" fill="#333" text-anchor="middle" font-weight="bold">RAID5(3台構成)のデータ配置</text>
              <rect x="30" y="30" width="90" height="20" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/><text x="75" y="45" font-size="10" fill="#333" text-anchor="middle">ディスク1</text>
              <rect x="140" y="30" width="90" height="20" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/><text x="185" y="45" font-size="10" fill="#333" text-anchor="middle">ディスク2</text>
              <rect x="250" y="30" width="90" height="20" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="1.5"/><text x="295" y="45" font-size="10" fill="#333" text-anchor="middle">ディスク3</text>

              <rect x="30" y="55" width="90" height="28" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="75" y="74" font-size="10" fill="#2f5fe0" text-anchor="middle">データA1</text>
              <rect x="140" y="55" width="90" height="28" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="185" y="74" font-size="10" fill="#2f5fe0" text-anchor="middle">データA2</text>
              <rect x="250" y="55" width="90" height="28" fill="#fff4e5" stroke="#c9820a" stroke-width="1.5"/><text x="295" y="74" font-size="10" fill="#c9820a" text-anchor="middle">パリティA</text>

              <rect x="30" y="88" width="90" height="28" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="75" y="107" font-size="10" fill="#2f5fe0" text-anchor="middle">データB1</text>
              <rect x="140" y="88" width="90" height="28" fill="#fff4e5" stroke="#c9820a" stroke-width="1.5"/><text x="185" y="107" font-size="10" fill="#c9820a" text-anchor="middle">パリティB</text>
              <rect x="250" y="88" width="90" height="28" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="295" y="107" font-size="10" fill="#2f5fe0" text-anchor="middle">データB2</text>

              <rect x="30" y="121" width="90" height="28" fill="#fff4e5" stroke="#c9820a" stroke-width="1.5"/><text x="75" y="140" font-size="10" fill="#c9820a" text-anchor="middle">パリティC</text>
              <rect x="140" y="121" width="90" height="28" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="185" y="140" font-size="10" fill="#2f5fe0" text-anchor="middle">データC1</text>
              <rect x="250" y="121" width="90" height="28" fill="#eef2ff" stroke="#2f5fe0" stroke-width="1.5"/><text x="295" y="140" font-size="10" fill="#2f5fe0" text-anchor="middle">データC2</text>
            </svg>
          `,
          caption: 'RAID5では、データとパリティ(誤り訂正情報)をディスクごとにずらしながら分散配置する。1台が故障しても、残りのディスクとパリティから元のデータを復元できる。'
        },
        { type: 'paragraph', html: 'ロードバランサは、複数のサーバへ処理要求を振り分けることで、特定のサーバへの負荷集中を防ぐ装置・仕組みである。あわせて各サーバの状態を常時監視(ヘルスチェック)し、障害が発生したサーバを振り分け先から自動的に除外するため、負荷分散だけでなく可用性の向上にも寄与する。' },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'RAID0は名前に「RAID」とついているが冗長性はなく、ディスク1台の故障でも全データを失う点に注意する。RAID5とRAID6は「パリティを分散配置する」という仕組みは共通しているが、耐えられる同時故障台数がそれぞれ1台と2台で異なる。また、ロードバランサ自身が停止するとシステム全体が止まってしまう単一障害点(SPOF)になり得るため、ロードバランサ自体も2台構成などで冗長化するのが一般的である、という点も応用情報技術者試験ではあわせて問われやすい。' }
      ]
    }
  ]
};
