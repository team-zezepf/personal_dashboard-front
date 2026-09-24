import { GenreContent } from '../../models/genre-content.models';

const DEVICE_SVG = (fill: string, stroke: string, textColor: string, label: string) => `
  <svg viewBox="0 0 100 60" width="100%" height="60">
    <rect x="10" y="10" width="60" height="40" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <text x="40" y="35" font-size="12" fill="${textColor}" text-anchor="middle" font-weight="bold">${label}</text>
  </svg>
`;

export const KIHONJOHO_HARDWARE_CONTENT: GenreContent = {
  examType: 'kihonjoho',
  genreKey: 'hardware',
  genreName: 'ハードウェア',
  description: '記憶装置・入出力装置・センサ/アクチュエータなど、ハードウェアを構成する基本要素の特徴を図解しています。読み終えたら下部から問題を解いて定着させましょう。',
  topics: [
    {
      title: '記憶装置(半導体メモリ・HDD/SSD・RAID)',
      relatedExamples: '関連する出題例: 「不揮発性の半導体メモリはどれか」「HDDとSSDの特徴として正しいもの」「複数の磁気ディスクを組み合わせて耐障害性を高める技術(RAID)」など',
      blocks: [
        { type: 'paragraph', html: '半導体メモリには、電源を切るとデータが消える「揮発性」のものと、電源を切ってもデータが保持される「不揮発性」のものがある。用途によって使い分けられている。' },
        {
          type: 'table',
          headers: ['メモリ種別', '揮発性', '特徴'],
          rows: [
            ['DRAM', '揮発性', 'コンデンサに電荷を蓄えて記憶する。定期的な再書き込み(リフレッシュ)が必要。主記憶装置に使用'],
            ['SRAM', '揮発性', 'フリップフロップ回路で記憶する。リフレッシュ不要で高速だが高コスト。キャッシュメモリに使用'],
            ['ROM', '不揮発性', '読み出し専用として利用される(一部、電気的に書換え可能なものもある)'],
            ['フラッシュメモリ', '不揮発性', '電気的にデータの消去・書き込みが可能。電源を切ってもデータを保持する。SSDやUSBメモリなどに使用']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <rect x="10" y="10" width="180" height="120" rx="8" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="100" y="30" font-size="14" fill="#2f5fe0" text-anchor="middle" font-weight="bold">HDD</text>
              <circle cx="100" cy="85" r="35" fill="none" stroke="#2f5fe0" stroke-width="2"/>
              <circle cx="100" cy="85" r="5" fill="#2f5fe0"/>
              <line x1="100" y1="85" x2="148" y2="58" stroke="#2f5fe0" stroke-width="2"/>
              <text x="100" y="142" font-size="11" fill="#2f5fe0" text-anchor="middle">磁気ディスクを回転させ読み書き(駆動部分あり)</text>

              <rect x="230" y="10" width="180" height="120" rx="8" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="320" y="30" font-size="14" fill="#1f9d55" text-anchor="middle" font-weight="bold">SSD</text>
              <rect x="270" y="55" width="100" height="60" rx="4" fill="#ffffff" stroke="#1f9d55" stroke-width="2"/>
              <text x="320" y="90" font-size="12" fill="#1f9d55" text-anchor="middle">半導体メモリ</text>
              <text x="320" y="142" font-size="11" fill="#1f9d55" text-anchor="middle">駆動部分なし(フラッシュメモリで記憶)</text>
            </svg>
          `,
          caption: 'HDDは磁気ディスクを回転させ磁気ヘッドで読み書きするため駆動部分を持つ。SSDは半導体メモリ(フラッシュメモリ)にデータを記録するため駆動部分を持たない。'
        },
        {
          type: 'table',
          headers: ['比較項目', 'HDD', 'SSD'],
          rows: [
            ['記憶媒体', '磁気ディスク(駆動部分あり)', '半導体メモリ(駆動部分なし)'],
            ['読み書き速度', '比較的遅い', '比較的速い'],
            ['耐衝撃性', '可動部があるため劣る', '優れる'],
            ['容量単価(1GBあたり)', '一般に安い', '一般に高い']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'HDDとSSDの比較問題では「速度」「耐衝撃性」「容量単価」の優劣が入れ替えられて出題されやすい。「HDDは可動部品を持ち低コスト、SSDは駆動部分がなく高速・耐衝撃だが単価は高い」という対応をセットで覚えること。' },
        { type: 'paragraph', html: 'RAID(Redundant Arrays of Inexpensive Disks)は、複数の磁気ディスク装置を組み合わせて1台の論理的な装置のように扱う技術である。データを分散して書き込むことで高速化を図ったり、同じデータを複数台に記録することで耐障害性を高めたりする。' },
        {
          type: 'table',
          headers: ['RAIDレベル', '方式', '特徴'],
          rows: [
            ['RAID0(ストライピング)', 'データを分散して複数ディスクに書き込む', '読み書きが高速化するが冗長性はなく、1台故障すると全データが失われる'],
            ['RAID1(ミラーリング)', '同じデータを複数ディスクに複製して書き込む', '耐障害性が高いが、実効容量はディスク合計より少なくなる'],
            ['RAID5', 'データと誤り訂正用のパリティを分散して記録', '1台の故障までは復旧可能。速度と耐障害性のバランスがよい']
          ]
        }
      ]
    },
    {
      title: '入出力装置とディスプレイ',
      relatedExamples: '関連する出題例: 「画素(ピクセル)の密度を表す用語(解像度)」「画面に指やペンで触れて入力する装置(タッチパネル)」「3次元データから立体物を造形する装置(3Dプリンタ)」など',
      blocks: [
        { type: 'paragraph', html: 'コンピュータの入出力装置は、人や外部環境とのデータのやり取りを担う。データを取り込む「入力装置」、データを出し出力する「出力装置」、両方を兼ねる「入出力装置」に大別できる。' },
        {
          type: 'table',
          headers: ['分類', '装置例', '説明'],
          rows: [
            ['入力装置', 'キーボード、マウス、スキャナ', '外部からデータを取り込む装置'],
            ['出力装置', 'ディスプレイ、プリンタ、プロッタ、3Dプリンタ', 'データを外部へ出力する装置(3Dプリンタは3D設計データをもとに材料を層状に積み重ねて立体物を造形する)'],
            ['入出力装置', 'タッチパネル', 'ディスプレイに指やペンで触れることで入力もできる、入力と出力を兼ねた装置']
          ]
        },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="60" y="20" font-size="13" fill="#333" text-anchor="middle" font-weight="bold">低解像度</text>
              <rect x="15" y="30" width="90" height="60" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <line x1="45" y1="30" x2="45" y2="90" stroke="#2f5fe0" stroke-width="1.5"/>
              <line x1="75" y1="30" x2="75" y2="90" stroke="#2f5fe0" stroke-width="1.5"/>
              <line x1="15" y1="60" x2="105" y2="60" stroke="#2f5fe0" stroke-width="1.5"/>
              <text x="60" y="112" font-size="11" fill="#2f5fe0" text-anchor="middle">画素数が少なく粗い</text>

              <text x="320" y="20" font-size="13" fill="#333" text-anchor="middle" font-weight="bold">高解像度</text>
              <rect x="245" y="30" width="150" height="60" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <line x1="270" y1="30" x2="270" y2="90" stroke="#1f9d55" stroke-width="1"/>
              <line x1="295" y1="30" x2="295" y2="90" stroke="#1f9d55" stroke-width="1"/>
              <line x1="320" y1="30" x2="320" y2="90" stroke="#1f9d55" stroke-width="1"/>
              <line x1="345" y1="30" x2="345" y2="90" stroke="#1f9d55" stroke-width="1"/>
              <line x1="370" y1="30" x2="370" y2="90" stroke="#1f9d55" stroke-width="1"/>
              <line x1="245" y1="45" x2="395" y2="45" stroke="#1f9d55" stroke-width="1"/>
              <line x1="245" y1="60" x2="395" y2="60" stroke="#1f9d55" stroke-width="1"/>
              <line x1="245" y1="75" x2="395" y2="75" stroke="#1f9d55" stroke-width="1"/>
              <text x="320" y="112" font-size="11" fill="#1f9d55" text-anchor="middle">画素数が多く精細</text>
            </svg>
          `,
          caption: '解像度は画素(ピクセル)の密度・きめ細かさを表す指標。画素数が多いほど精細な表示になる。'
        },
        {
          type: 'iconGrid',
          items: [
            { svg: DEVICE_SVG('#eef2ff', '#2f5fe0', '#2f5fe0', 'タッチ'), label: 'タッチパネル', desc: '画面に指やペンで直接触れて入力' },
            { svg: DEVICE_SVG('#eafaf0', '#1f9d55', '#1f9d55', 'トラック'), label: 'トラックボール', desc: '固定された球を転がしてポインタを操作' },
            { svg: DEVICE_SVG('#fff4e5', '#c9820a', '#c9820a', 'ジョイ'), label: 'ジョイスティック', desc: 'レバーを倒して方向・位置を入力' },
            { svg: DEVICE_SVG('#f3e8ff', '#7c3aed', '#7c3aed', 'ライト'), label: 'ライトペン', desc: 'ペン先を画面に当てて位置を検出' }
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: '「解像度」(画素の密度)、「リフレッシュレート」(1秒間に画面を書き換える回数)、「コントラスト比」(最も明るい部分と暗い部分の差)、「応答速度」(画素の色が変化する速さ)は、いずれもディスプレイの性能を表す別の指標であり混同しやすい。画素の“数・密度”を表す用語は解像度だけである。' }
      ]
    },
    {
      title: 'センサとアクチュエータ',
      relatedExamples: '関連する出題例: 「温度・湿度・光量などの物理的な情報を電気信号に変換して取り込む装置(センサ)」「電気信号を受けて機械的な運動に変換する装置(アクチュエータ)」など',
      blocks: [
        { type: 'paragraph', html: 'センサとアクチュエータは、コンピュータ(制御装置)と物理世界とを結ぶ装置であり、組み込みシステムやIoT機器で対になって使われることが多い。変換する向きが正反対である点が重要である。' },
        {
          type: 'figure',
          svg: `
            <svg viewBox="0 0 440 150" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
              <text x="60" y="30" font-size="11" fill="#2f5fe0" text-anchor="middle">温度・湿度・光など</text>
              <rect x="10" y="50" width="110" height="50" rx="8" fill="#eef2ff" stroke="#2f5fe0" stroke-width="2"/>
              <text x="65" y="80" font-size="14" fill="#2f5fe0" text-anchor="middle" font-weight="bold">センサ</text>

              <line x1="120" y1="75" x2="175" y2="75" stroke="#333" stroke-width="2"/>
              <text x="147" y="65" font-size="10" fill="#333" text-anchor="middle">電気信号</text>

              <rect x="175" y="50" width="100" height="50" rx="8" fill="#f7f9fb" stroke="#c7cdd6" stroke-width="2"/>
              <text x="225" y="80" font-size="13" fill="#333" text-anchor="middle" font-weight="bold">制御装置</text>

              <line x1="275" y1="75" x2="330" y2="75" stroke="#333" stroke-width="2"/>
              <text x="302" y="65" font-size="10" fill="#333" text-anchor="middle">制御信号</text>

              <rect x="330" y="50" width="100" height="50" rx="8" fill="#eafaf0" stroke="#1f9d55" stroke-width="2"/>
              <text x="380" y="80" font-size="13" fill="#1f9d55" text-anchor="middle" font-weight="bold">アクチュエータ</text>
              <text x="380" y="30" font-size="11" fill="#1f9d55" text-anchor="middle">回転・振動など機械的な運動</text>
            </svg>
          `,
          caption: 'センサは物理量を電気信号に変換して制御装置に渡し(入力)、制御装置からの指令をアクチュエータが機械的な動きに変換する(出力)。'
        },
        {
          type: 'table',
          headers: ['検出する物理量', 'センサの例'],
          rows: [
            ['温度', '温度センサ'],
            ['湿度', '湿度センサ'],
            ['光量', '光センサ(照度センサ)'],
            ['圧力', '圧力センサ']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'センサとアクチュエータは変換の向きが逆である。センサは「物理量→電気信号」(入力装置)、アクチュエータは「電気信号→機械的な運動」(出力装置)。名称と働きを取り違えないよう注意する。' }
      ]
    },
    {
      title: '処理装置と近距離無線通信',
      relatedExamples: '関連する出題例: 「画像処理やグラフィックス描画に特化した演算を高速に行う処理装置(GPU)」「ICカードやスマートフォンをかざすだけで通信する近距離無線技術(NFC)」など',
      blocks: [
        { type: 'paragraph', html: 'コンピュータの主要な処理装置には、汎用的な処理を順に実行するCPUのほか、特定の処理に特化した専用の処理装置がある。' },
        {
          type: 'table',
          headers: ['項目', 'CPU', 'GPU'],
          rows: [
            ['得意な処理', '複雑な条件分岐を含む汎用的な処理を順に実行', '同種の演算を大量のデータに並列に実行(画像処理向き)'],
            ['コア数', '少数の高性能なコア', '多数の単純な演算コア'],
            ['主な用途', 'OSの制御、アプリケーションの実行など全般', '画像処理・グラフィックス描画、機械学習の演算など']
          ]
        },
        { type: 'paragraph', html: '近距離無線通信にはいくつかの規格があり、通信できる距離や用途によって使い分けられる。' },
        {
          type: 'table',
          headers: ['技術', '通信距離の目安', '特徴'],
          rows: [
            ['NFC', '数cm〜10cm程度', 'ICカードやスマートフォンなどをかざすだけで通信できる近距離無線通信技術。交通系ICカードや決済などに利用'],
            ['Bluetooth', '数m〜数十m程度', 'ヘッドホンやマウスなど周辺機器の無線接続に広く利用'],
            ['Wi-Fi', '数十m程度(屋内)', '無線LANとしてネットワークへの接続に利用'],
            ['赤外線通信', '数m程度(見通し内)', '赤外線を使った通信。家電のリモコンなどに利用']
          ]
        },
        { type: 'pitfall', label: 'つまずきやすいポイント', html: 'NFCは「かざすだけ」で通信できる極めて近距離(数cm程度)の技術である点が最大の特徴。Bluetooth・Wi-Fiなど他の無線通信技術との通信距離の違いが問われやすいので、距離の大小関係(NFC < Bluetooth < Wi-Fi)を押さえておく。' }
      ]
    }
  ]
};
