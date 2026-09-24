import { GenreContent } from '../../models/genre-content.models';

const FUNC_ICON = (fill: string, stroke: string, textColor: string, label: string) => `
  <svg viewBox="0 0 100 60" width="100%" height="60">
    <rect x="10" y="10" width="80" height="40" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <text x="50" y="35" font-size="13" fill="${textColor}" text-anchor="middle" font-weight="bold">${label}</text>
  </svg>
`;

export const KIHONJOHO_SOFTWARE_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'software',
  genreName: 'ソフトウェア',
  description: 'OSの役割・基本機能や仮想記憶、ミドルウェア・デバイスドライバなどの周辺ソフトウェア、ソフトウェアの品質特性・配布形態など、ソフトウェア分野で問われる要点を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: 'ソフトウェアの品質特性',
      relatedExamples: '関連する出題例: 「JIS X 0129(ソフトウェア製品の品質特性)における『信頼性』の説明として最も適切なものはどれか」',
      blocks: [
        { type: 'paragraph', html: 'ソフトウェアの品質は、JIS X 0129(ISO/IEC 9126)により機能性・信頼性・使用性・効率性・保守性・移植性の6つの特性に整理されている。試験では各特性の説明文を読み、どの特性を指しているかを見分ける問題が出やすい。' },
        {
          type: 'table',
          headers: ['特性', '説明'],
          rows: [
            ['機能性', '利用者が必要とする機能を、指定された条件下で備えている度合い'],
            ['信頼性', '指定された条件下で、要求された機能を維持して動作し続ける能力'],
            ['使用性', '利用者が理解し、習得し、使用しやすい度合い'],
            ['効率性', '少ない資源で効率よく処理を行う能力'],
            ['保守性', 'システムの機能を理解し、修正しやすい度合い'],
            ['移植性', '別の環境(機種・OSなど)に移しやすい度合い']
          ]
        },
        {
          type: 'example',
          label: '例題: 「信頼性」の説明として最も適切なものはどれか',
          html: '選択肢: ①必要なときにシステムを利用できる度合い ②指定された条件下で、要求された機能を維持して動作し続ける能力 ③少ない資源で効率よく処理を行う能力 ④システムの機能を理解し、修正しやすい度合い<br>①は可用性、③は効率性、④は保守性の説明である。よって正解は<strong>②</strong>。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「信頼性」と「可用性」は混同しやすい。信頼性は障害を起こさず動作し続ける能力(壊れにくさ)を指すのに対し、可用性は必要なときにシステムを利用できる度合い(稼働率のようなもの)を指す。試験では選択肢として並べて出されることが多いので、意味の違いを区別しておく。' }
      ]
    },
    {
      title: 'OSの役割と基本機能',
      relatedExamples: '関連する出題例: 「ハードウェア資源を管理し共通の実行環境を提供する基本ソフトウェアは何か」「OSの資源管理機能とは」「ジョブ管理・タスク管理の役割」「複数のプログラムを同時並行的に実行しているように見せる方式は何か」など',
      blocks: [
        { type: 'paragraph', html: 'OS(オペレーティングシステム)は、CPUやメモリなどのハードウェア資源を管理し、アプリケーションソフトウェアに共通の実行環境を提供する基本ソフトウェアである。OSの代表的な機能として、資源管理・ジョブ管理・タスク管理がある。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 190" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="60" y="140" width="280" height="40" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="200" y="165" font-size="13" fill="#333" text-anchor="middle" font-weight="bold">ハードウェア(CPU・メモリ・入出力装置)</text>
              <line x1="200" y1="140" x2="200" y2="120" stroke="#333" stroke-width="2"/>
              <rect x="60" y="70" width="280" height="50" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="200" y="92" font-size="14" fill="#2f5fe0" text-anchor="middle" font-weight="bold">OS(基本ソフトウェア)</text>
              <text x="200" y="110" font-size="11" fill="#2f5fe0" text-anchor="middle">資源管理・ジョブ管理・タスク管理</text>
              <line x1="200" y1="70" x2="200" y2="50" stroke="#333" stroke-width="2"/>
              <rect x="60" y="10" width="280" height="40" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="200" y="35" font-size="14" fill="#1f9d55" text-anchor="middle" font-weight="bold">アプリケーションソフトウェア</text>
            </svg>
          `,
          caption: 'OSはハードウェアとアプリケーションソフトウェアの間に位置し、共通の実行環境を提供する。'
        },
        {
          type: 'iconGrid',
          items: [
            { svg: FUNC_ICON('#eef2ff', '#2f5fe0', '#2f5fe0', '資源管理'), label: '資源管理機能', desc: 'CPU・メモリ・入出力装置などのハードウェア資源を複数のプログラムに配分する' },
            { svg: FUNC_ICON('#eafaf0', '#1f9d55', '#1f9d55', 'ジョブ管理'), label: 'ジョブ管理', desc: '利用者が依頼した一連の処理(ジョブ)を、投入から終了まで一括して管理する' },
            { svg: FUNC_ICON('#fff4e5', '#c9820a', '#c9820a', 'タスク管理'), label: 'タスク管理(プロセス管理)', desc: '実行中の個々のプログラム(プロセス)にCPU時間の割り当てなどを制御する' }
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 130" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="10" y="18" font-size="12" fill="#333">CPU時間の流れ →</text>
              <line x1="10" y1="100" x2="410" y2="100" stroke="#333" stroke-width="1"/>
              <rect x="10" y="60" width="90" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="55" y="85" font-size="12" fill="#2f5fe0" text-anchor="middle">プログラムA</text>
              <rect x="100" y="60" width="90" height="40" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="145" y="85" font-size="12" fill="#1f9d55" text-anchor="middle">プログラムB</text>
              <rect x="190" y="60" width="90" height="40" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="235" y="85" font-size="12" fill="#2f5fe0" text-anchor="middle">プログラムA</text>
              <rect x="280" y="60" width="90" height="40" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="325" y="85" font-size="12" fill="#1f9d55" text-anchor="middle">プログラムB</text>
            </svg>
          `,
          caption: 'マルチタスクでは、OSがCPU時間を細かく分割して複数のプログラムに切り替えながら割り当てるため、あたかも同時に実行しているように見える。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ジョブ管理は利用者が依頼した一連の処理(ジョブ)を投入から終了まで一括して管理するのに対し、タスク管理(プロセス管理)は実行中の個々のプログラム(プロセス・タスク)にCPU時間を割り当てるなど、より細かい単位を制御する機能である。「ジョブ」と「タスク(プロセス)」の粒度の違いを混同しないこと。' }
      ]
    },
    {
      title: 'ファイル管理と仮想記憶',
      relatedExamples: '関連する出題例: 「ジャーナリングファイルシステムの特徴として、最も適切なものはどれか」「主記憶の容量を超えるプログラムを実行できるようにする技術は何か」「仮想記憶における主記憶と補助記憶の入れ替え処理は何か」など',
      blocks: [
        { type: 'paragraph', html: 'ファイルシステムは、補助記憶装置上のデータをファイル単位で管理し、作成・読み書き・削除などの操作を可能にするOSの機能である。' },
        { type: 'paragraph', html: '仮想記憶は、補助記憶装置の一部を主記憶の延長として扱うことで、実際の主記憶容量を超えるサイズのプログラムやデータを扱えるようにする技術である。主記憶に入りきらないデータは、必要に応じて補助記憶装置との間で入れ替えられる。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="20" y="30" width="140" height="70" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="90" y="60" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">主記憶</text>
              <text x="90" y="78" font-size="10" fill="#2f5fe0" text-anchor="middle">(容量小・高速)</text>
              <rect x="260" y="20" width="140" height="90" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="330" y="52" font-size="13" fill="#333" text-anchor="middle" font-weight="bold">補助記憶装置</text>
              <text x="330" y="70" font-size="10" fill="#333" text-anchor="middle">(容量大・低速)</text>
              <text x="330" y="88" font-size="10" fill="#333" text-anchor="middle">仮想記憶として利用</text>
              <line x1="160" y1="52" x2="260" y2="52" stroke="#c9820a" stroke-width="2"/>
              <text x="210" y="44" font-size="10" fill="#c9820a" text-anchor="middle">スワップアウト</text>
              <line x1="260" y1="82" x2="160" y2="82" stroke="#c9820a" stroke-width="2"/>
              <text x="210" y="100" font-size="10" fill="#c9820a" text-anchor="middle">スワップイン</text>
            </svg>
          `,
          caption: 'スワッピングは、仮想記憶において主記憶に入りきらないデータを補助記憶装置との間で入れ替える処理である。'
        },
        {
          type: 'example',
          label: '例題: 主記憶の容量を超えるプログラムを実行できるようにする技術は何か',
          html: '選択肢: ①仮想記憶 ②キャッシュメモリ ③デフラグメンテーション ④スワッピング<br>②は処理速度を高速化する仕組み、③は記憶領域の断片化を解消する処理、④は仮想記憶を実現するための入れ替え処理そのものを指す。「容量を超えて扱えるようにする」技術自体を指すのは<strong>①仮想記憶</strong>。'
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「仮想記憶」は主記憶容量を超えるサイズのプログラムやデータを扱うための仕組み(概念)であり、「スワッピング」はその仕組みを実現するために主記憶と補助記憶の間で実際にデータを入れ替える処理を指す。両者を同じ意味だと思い込まないこと。また、キャッシュメモリは処理速度を高速化するための仕組みであり、記憶容量を拡張する仮想記憶とは目的が異なる。' }
      ]
    },
    {
      title: '周辺ソフトウェア(ミドルウェア・デバイスドライバ・ファームウェア)',
      relatedExamples: '関連する出題例: 「OSとアプリケーションの中間に位置し共通機能を提供するソフトウェアは何か」「特定の周辺機器をOSが制御できるようにするソフトウェアは何か」「ハードウェアに組み込まれ基本的な動作を制御するソフトウェアは何か」など',
      blocks: [
        { type: 'paragraph', html: 'ハードウェアとアプリケーションソフトウェアの間には、それぞれ異なる役割を担うソフトウェアが階層的に存在する。ファームウェアは機器に組み込まれてハードウェアの基本動作を制御し、デバイスドライバはOSが個々の周辺機器を制御できるようにし、ミドルウェアはOSとアプリケーションの中間で共通機能を提供する。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="60" y="0" width="280" height="36" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="200" y="23" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">アプリケーションソフトウェア</text>
              <rect x="60" y="46" width="280" height="36" rx="6" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/>
              <text x="200" y="69" font-size="13" fill="#7c3aed" text-anchor="middle" font-weight="bold">ミドルウェア</text>
              <rect x="60" y="92" width="280" height="36" rx="6" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="200" y="115" font-size="13" fill="#2f5fe0" text-anchor="middle" font-weight="bold">OS(+デバイスドライバ)</text>
              <rect x="60" y="138" width="280" height="36" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="200" y="161" font-size="13" fill="#c9820a" text-anchor="middle" font-weight="bold">ファームウェア</text>
              <rect x="60" y="184" width="280" height="36" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="200" y="207" font-size="13" fill="#333" text-anchor="middle" font-weight="bold">ハードウェア</text>
            </svg>
          `,
          caption: 'ハードウェアに近い順に、ファームウェア→OS(デバイスドライバを含む)→ミドルウェア→アプリケーションという階層で捉えられる。'
        },
        {
          type: 'table',
          headers: ['種類', '特徴'],
          rows: [
            ['デバイスドライバ', '特定の周辺機器をOSが制御できるようにするため、機器ごとに用意される制御用ソフトウェア'],
            ['ミドルウェア', 'OSとアプリケーションソフトウェアの中間に位置し、データベース接続など特定の共通機能を提供するソフトウェア'],
            ['ファームウェア', 'ハードウェアの制御のために機器に組み込まれた、基本的な動作を制御するソフトウェア(ROM等に格納されることが多い)']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'ファームウェアは機器本体に組み込まれる(ハードウェア寄りの)ソフトウェアであるのに対し、デバイスドライバはOS側から個々のハードウェアを制御するためのソフトウェアである。また、ミドルウェアはOSとアプリケーションの間で共通機能を提供するものであり、特定の周辺機器を制御するデバイスドライバとは役割が異なる。3つの「制御・仲介ソフトウェア」が担う境界の違いを整理して覚える。' }
      ]
    },
    {
      title: 'ソフトウェアの配布形態',
      relatedExamples: '関連する出題例: 「ソースコードが公開され誰でも自由に利用・改変・再配布できるソフトウェアは何か」「一定期間または一定機能を無料で試用でき継続利用時に対価を求める配布形態は何か」など',
      blocks: [
        { type: 'paragraph', html: 'ソフトウェアには、ソースコードの公開範囲や対価の有無によっていくつかの配布形態がある。' },
        {
          type: 'table',
          headers: ['配布形態', '特徴'],
          rows: [
            ['フリーウェア', '無償で利用できるソフトウェア(ソースコードは非公開であることが多い)'],
            ['シェアウェア', '一定期間または一定機能を無料で試用でき、継続して利用する場合には対価の支払いを求める配布形態'],
            ['オープンソースソフトウェア(OSS)', 'ソースコードが公開されており、一定のライセンス条件の下で誰でも自由に利用・改変・再配布できるソフトウェア'],
            ['パッケージソフトウェア', '汎用的な機能を持ち、パッケージ化されて販売・提供されるソフトウェア']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「無料かどうか」だけで判断しないこと。フリーウェアとシェアウェアはどちらも無料で使い始められるが、シェアウェアは継続利用に対価が必要になる点で異なる。また、オープンソースソフトウェアの本質は「無料」であることではなく、「ソースコードが公開され、改変・再配布が認められている」ことである。' }
      ]
    }
  ]
};
