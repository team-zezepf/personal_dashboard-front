import { GenreContent } from '../../models/genre-content.models';

export const OYOJOHO_COMPUTER_COMPONENTS_CONTENT: GenreContent = {
  examType: 'oyojoho',
  genreKey: 'computer-components',
  genreName: 'コンピュータ構成要素',
  category: 'テクノロジ系',
  description: 'CPUの性能評価(クロック周波数・CPI・MIPS)とパイプライン処理による高速化、キャッシュメモリの実効アクセス時間、割り込み・DMAによる入出力制御など、応用情報技術者試験のコンピュータ構成要素で頻出する計算問題の解き方を中心に整理しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: 'CPUの性能評価(クロック・CPI・MIPS)とパイプライン処理',
      blocks: [
        {
          type: 'paragraph',
          html: 'CPUの処理速度はクロック周波数だけでは決まらない。実際には「1命令あたり平均何クロック要するか」を表すCPI(Cycles Per Instruction)を合わせて考える必要がある。応用情報技術者試験では、クロック周波数とCPIから実行時間やMIPS(1秒あたりに実行できる命令数を百万単位で表した指標)を求める計算問題が頻出する。'
        },
        {
          type: 'table',
          headers: ['用語', '意味'],
          rows: [
            ['クロック周波数', 'CPUが1秒間に発生させるクロック信号の回数(Hz)。値が大きいほど1クロックの時間は短い'],
            ['CPI', '1命令の実行に平均して必要なクロック数。命令の種類や回路構成によって変わる'],
            ['MIPS', '1秒間に実行できる命令数を百万(10⁶)単位で表した指標。MIPS = クロック周波数 ÷ (CPI × 10⁶)']
          ]
        },
        {
          type: 'formula',
          label: 'クロック周期・実行時間・MIPSの関係',
          html: 'クロック周期(秒) = 1 ÷ クロック周波数(Hz)<br>1命令あたりの実行時間 = CPI × クロック周期<br>1秒あたりの実行命令数 = クロック周波数 ÷ CPI<br>MIPS = (クロック周波数 ÷ CPI) ÷ 10⁶'
        },
        {
          type: 'example',
          label: '例題: クロック周波数2GHz、CPI=4のときのMIPS値',
          html: 'クロック周期 = 1 ÷ (2×10⁹) = 0.5ナノ秒<br>1秒あたりの実行命令数 = クロック周波数 ÷ CPI = (2×10⁹) ÷ 4 = 5×10⁸ 命令/秒<br>MIPS換算 = (5×10⁸) ÷ 10⁶ = <strong>500 MIPS</strong>'
        },
        {
          type: 'paragraph',
          html: '命令の実行は「取り出し(IF)→解読(ID)→実行(EX)→書き戻し(WB)」のような複数の段階に分割できる。これらの段階を1命令が完了してから次の命令に着手するのではなく、各段階を少しずつずらして複数の命令を並行に処理する方式がパイプライン処理である。パイプライン処理は1命令の実行時間(レイテンシ)そのものを短縮するのではなく、単位時間あたりに完了する命令数(スループット)を高める技術である点に注意する。'
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 215" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="10" y="14" font-size="11" fill="#333" font-weight="bold">パイプラインなし(逐次処理)</text>
              <text x="10" y="34" font-size="10" fill="#333">命令1</text>
              <text x="10" y="59" font-size="10" fill="#333">命令2</text>
              <text x="10" y="84" font-size="10" fill="#333">命令3</text>
              <g font-size="9" text-anchor="middle" font-weight="bold">
                <rect x="70" y="22" width="25" height="18" fill="#eef2ff" stroke="#2f5fe0"/><text x="82" y="35" fill="#2f5fe0">IF</text>
                <rect x="95" y="22" width="25" height="18" fill="#eafaf0" stroke="#1f9d55"/><text x="107" y="35" fill="#1f9d55">ID</text>
                <rect x="120" y="22" width="25" height="18" fill="#fff4e5" stroke="#c9820a"/><text x="132" y="35" fill="#c9820a">EX</text>
                <rect x="145" y="22" width="25" height="18" fill="#f3e8ff" stroke="#7c3aed"/><text x="157" y="35" fill="#7c3aed">WB</text>

                <rect x="170" y="47" width="25" height="18" fill="#eef2ff" stroke="#2f5fe0"/><text x="182" y="60" fill="#2f5fe0">IF</text>
                <rect x="195" y="47" width="25" height="18" fill="#eafaf0" stroke="#1f9d55"/><text x="207" y="60" fill="#1f9d55">ID</text>
                <rect x="220" y="47" width="25" height="18" fill="#fff4e5" stroke="#c9820a"/><text x="232" y="60" fill="#c9820a">EX</text>
                <rect x="245" y="47" width="25" height="18" fill="#f3e8ff" stroke="#7c3aed"/><text x="257" y="60" fill="#7c3aed">WB</text>

                <rect x="270" y="72" width="25" height="18" fill="#eef2ff" stroke="#2f5fe0"/><text x="282" y="85" fill="#2f5fe0">IF</text>
                <rect x="295" y="72" width="25" height="18" fill="#eafaf0" stroke="#1f9d55"/><text x="307" y="85" fill="#1f9d55">ID</text>
                <rect x="320" y="72" width="25" height="18" fill="#fff4e5" stroke="#c9820a"/><text x="332" y="85" fill="#c9820a">EX</text>
                <rect x="345" y="72" width="25" height="18" fill="#f3e8ff" stroke="#7c3aed"/><text x="357" y="85" fill="#7c3aed">WB</text>
              </g>

              <line x1="10" y1="100" x2="410" y2="100" stroke="#e2e6ec" stroke-width="1"/>

              <text x="10" y="118" font-size="11" fill="#333" font-weight="bold">パイプラインあり(重ね合わせ)</text>
              <text x="10" y="140" font-size="10" fill="#333">命令1</text>
              <text x="10" y="165" font-size="10" fill="#333">命令2</text>
              <text x="10" y="190" font-size="10" fill="#333">命令3</text>
              <g font-size="9" text-anchor="middle" font-weight="bold">
                <rect x="70" y="128" width="25" height="18" fill="#eef2ff" stroke="#2f5fe0"/><text x="82" y="141" fill="#2f5fe0">IF</text>
                <rect x="95" y="128" width="25" height="18" fill="#eafaf0" stroke="#1f9d55"/><text x="107" y="141" fill="#1f9d55">ID</text>
                <rect x="120" y="128" width="25" height="18" fill="#fff4e5" stroke="#c9820a"/><text x="132" y="141" fill="#c9820a">EX</text>
                <rect x="145" y="128" width="25" height="18" fill="#f3e8ff" stroke="#7c3aed"/><text x="157" y="141" fill="#7c3aed">WB</text>

                <rect x="95" y="153" width="25" height="18" fill="#eef2ff" stroke="#2f5fe0"/><text x="107" y="166" fill="#2f5fe0">IF</text>
                <rect x="120" y="153" width="25" height="18" fill="#eafaf0" stroke="#1f9d55"/><text x="132" y="166" fill="#1f9d55">ID</text>
                <rect x="145" y="153" width="25" height="18" fill="#fff4e5" stroke="#c9820a"/><text x="157" y="166" fill="#c9820a">EX</text>
                <rect x="170" y="153" width="25" height="18" fill="#f3e8ff" stroke="#7c3aed"/><text x="182" y="166" fill="#7c3aed">WB</text>

                <rect x="120" y="178" width="25" height="18" fill="#eef2ff" stroke="#2f5fe0"/><text x="132" y="191" fill="#2f5fe0">IF</text>
                <rect x="145" y="178" width="25" height="18" fill="#eafaf0" stroke="#1f9d55"/><text x="157" y="191" fill="#1f9d55">ID</text>
                <rect x="170" y="178" width="25" height="18" fill="#fff4e5" stroke="#c9820a"/><text x="182" y="191" fill="#c9820a">EX</text>
                <rect x="195" y="178" width="25" height="18" fill="#f3e8ff" stroke="#7c3aed"/><text x="207" y="191" fill="#7c3aed">WB</text>
              </g>
            </svg>
          `,
          caption: '4段(IF/ID/EX/WB)のパイプライン。逐次処理では命令2は命令1の全段階が終わってから開始するが、パイプライン処理では各段階を1段ずつずらして重ね合わせることで、全体の完了時間を短縮する。'
        },
        {
          type: 'formula',
          label: 'パイプラインによる所要時間と高速化率',
          html: '非パイプライン実行時間 = 命令数 × 段数 × 1段あたりの処理時間<br>パイプライン実行時間 = (段数 + 命令数 − 1) × 1段あたりの処理時間<br>高速化率 = 非パイプライン実行時間 ÷ パイプライン実行時間'
        },
        {
          type: 'example',
          label: '例題: 4段パイプライン(1段1ns)で10命令を実行する場合',
          html: '非パイプライン実行時間 = 10 × 4 × 1ns = 40ns<br>パイプライン実行時間 = (4 + 10 − 1) × 1ns = 13ns<br>高速化率 = 40 ÷ 13 ≒ <strong>3.08倍</strong>(命令数を増やすほど、高速化率は理論上の上限である段数=4倍に近づく)'
        },
        {
          type: 'pitfall',
          label: 'つまずきやすいポイント',
          html: 'MIPSは「クロック周波数 ÷ CPI」を百万単位に直した値であり、クロック周波数の値をそのままMIPSと混同しないこと。また、パイプライン処理は1命令の実行時間(レイテンシ)を短縮するのではなく、複数命令を重ね合わせることでスループットを高める技術である。段数を増やせば増やすほど高速化率が際限なく伸びるわけではなく、理論上の上限は段数倍にとどまる点も押さえておく。'
        }
      ]
    },
    {
      title: 'キャッシュメモリと記憶階層(実効アクセス時間・SRAM/DRAM)',
      blocks: [
        {
          type: 'paragraph',
          html: 'CPUと主記憶の間には速度差があるため、その差を埋める目的でCPUと主記憶の間にキャッシュメモリが置かれる。CPUが必要とするデータが高速なキャッシュメモリ上に存在する割合をヒット率と呼び、ヒット率とキャッシュ・主記憶それぞれのアクセス時間から、平均的なアクセス時間である実効アクセス時間を計算できる。'
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 185" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="70" width="70" height="40" rx="6" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="45" y="94" font-size="11" fill="#333" text-anchor="middle">CPU</text>

              <rect x="110" y="70" width="120" height="40" rx="6" fill="#e6f7fa" stroke="#0f8fa8" stroke-width="2"/>
              <text x="170" y="88" font-size="10" fill="#0f8fa8" text-anchor="middle">キャッシュ確認</text>
              <text x="170" y="102" font-size="9" fill="#0f8fa8" text-anchor="middle">(ヒット率90%)</text>

              <line x1="80" y1="90" x2="110" y2="90" stroke="#333" stroke-width="2"/>

              <line x1="150" y1="110" x2="130" y2="140" stroke="#1f9d55" stroke-width="2"/>
              <text x="95" y="128" font-size="9" fill="#1f9d55">ヒット 90%</text>
              <rect x="60" y="142" width="150" height="34" rx="6" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="135" y="163" font-size="10" fill="#1f9d55" text-anchor="middle">キャッシュから取得 10ns</text>

              <line x1="230" y1="90" x2="290" y2="90" stroke="#c9820a" stroke-width="2"/>
              <text x="238" y="82" font-size="9" fill="#c9820a">ミス 10%</text>
              <rect x="290" y="70" width="120" height="40" rx="6" fill="#fff4e5" stroke="#c9820a" stroke-width="2"/>
              <text x="350" y="88" font-size="10" fill="#c9820a" text-anchor="middle">主記憶へアクセス</text>
              <text x="350" y="102" font-size="9" fill="#c9820a" text-anchor="middle">100ns</text>
            </svg>
          `,
          caption: 'CPUはまずキャッシュメモリを確認し、ヒットすれば短時間(10ns)で、ミスすれば低速な主記憶(100ns)へアクセスする。実効アクセス時間はこの2つの経路の加重平均である。'
        },
        {
          type: 'formula',
          label: '実効アクセス時間',
          html: '実効アクセス時間 = ヒット率 × キャッシュのアクセス時間 + (1 − ヒット率) × 主記憶のアクセス時間'
        },
        {
          type: 'example',
          label: '例題: ヒット率90%、キャッシュ10ns、主記憶100nsのときの実効アクセス時間',
          html: '実効アクセス時間 = 0.9 × 10ns + 0.1 × 100ns = 9ns + 10ns = <strong>19ns</strong>'
        },
        {
          type: 'example',
          label: '例題(応用): 主記憶150ns・キャッシュ5nsのとき、実効アクセス時間を19.5ns以下にするために必要な最小ヒット率',
          html: '19.5 = h × 5 + (1 − h) × 150 とおく<br>19.5 = 5h + 150 − 150h = 150 − 145h<br>145h = 150 − 19.5 = 130.5<br>h = 130.5 ÷ 145 = 0.9 → 最小ヒット率は<strong>90%</strong>'
        },
        {
          type: 'table',
          headers: ['種類', '特徴'],
          rows: [
            ['SRAM', 'リフレッシュ動作が不要で高速だが、回路が複雑で高価・小容量。主にキャッシュメモリに使用される'],
            ['DRAM', 'コンデンサに電荷を蓄えて記憶するため定期的なリフレッシュ動作が必要な揮発性メモリ。構造が単純で大容量化・低コスト化に向き、主記憶に使用される']
          ]
        },
        {
          type: 'pitfall',
          label: 'つまずきやすいポイント',
          html: '実効アクセス時間の公式では「ヒット率×キャッシュのアクセス時間」と「(1−ヒット率)×主記憶のアクセス時間」の対応を逆にしないこと(ヒットしたときは高速なキャッシュ、ミスしたときは低速な主記憶にアクセスする)。またSRAM(高速・高価・小容量・リフレッシュ不要)とDRAM(低速・安価・大容量・リフレッシュ必要)の特徴は逆に覚えやすいので、「Dynamic=動的=定期的なリフレッシュが必要」と関連付けて区別するとよい。'
        }
      ]
    },
    {
      title: '入出力の制御方式(割り込み・DMA)',
      blocks: [
        {
          type: 'paragraph',
          html: 'CPUと入出力装置との間でデータをやり取りする際、処理速度の遅い入出力装置にCPUが逐一付き合っていては効率が悪い。この問題を解決するための代表的な制御方式が割り込みとDMA(Direct Memory Access)である。'
        },
        {
          type: 'table',
          headers: ['方式', '概要'],
          rows: [
            ['ポーリング(プログラム制御方式)', 'CPUが周辺装置の状態を一定間隔で繰り返し確認しに行く方式。実装は単純だが、確認のためにCPUの処理能力を消費してしまう'],
            ['割り込み', '周辺装置側からCPUへ処理完了などを通知し、CPUは現在の処理を一時中断して割り込みハンドラ(割り込み処理)を実行したのち、元の処理に復帰する方式'],
            ['DMA(Direct Memory Access)', 'CPUを介さずに、DMAコントローラが周辺装置と主記憶の間で直接データ転送を行う方式。転送中もCPUは他の処理を並行して実行できるため、大量データ転送時のCPU負荷を大きく軽減できる']
          ]
        },
        {
          type: 'paragraph',
          html: '割り込みが発生すると、CPUは実行中の処理の状態(プログラムカウンタやレジスタの内容など)を退避し、あらかじめ用意された割り込みハンドラへ制御を移す。割り込みハンドラの処理が完了すると、退避しておいた状態を復元して、中断していた元の処理を再開する。'
        },
        {
          type: 'pitfall',
          label: 'つまずきやすいポイント',
          html: '割り込みとDMAはどちらもCPUの負荷軽減に関わる仕組みだが、目的が異なる。割り込みは「CPUの処理を一時中断し、割り込みハンドラを実行してから元の処理に戻る」仕組みであるのに対し、DMAは「CPUを介さずに周辺装置と主記憶の間でデータそのものを直接転送する」仕組みである。「CPUの処理を中断して専用の処理を行う」という記述だけを見てDMAを選んでしまわないよう、主語(何が・何をするか)を丁寧に読み分けること。'
        }
      ]
    }
  ]
};
