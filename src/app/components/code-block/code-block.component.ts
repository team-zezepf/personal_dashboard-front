import { Component, computed, input } from '@angular/core';

interface CodeSegment {
  text: string;
  // 〔a〕のような空欄。オレンジの枠で強調表示する
  isBlank: boolean;
}

// 空欄は全角の亀甲括弧で囲んで書く(例: if (〔a〕))
const BLANK_PATTERN = /〔([^〕]*)〕/g;

function parseLine(line: string): CodeSegment[] {
  const segments: CodeSegment[] = [];
  let lastIndex = 0;
  for (const match of line.matchAll(BLANK_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, index), isBlank: false });
    }
    segments.push({ text: match[1], isBlank: true });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), isBlank: false });
  }
  return segments;
}

/**
 * 基本情報 科目Bなどの擬似言語のプログラムを、行番号付き・インデント保持で表示する。
 * [innerHTML]を使わずに空欄を強調するため、行ごとにテキストと空欄の区間へ分割して描画している。
 */
@Component({
  selector: 'app-code-block',
  standalone: true,
  templateUrl: './code-block.component.html',
  styleUrl: './code-block.component.css'
})
export class CodeBlockComponent {
  readonly code = input.required<string>();

  readonly lines = computed(() =>
    this.code().replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n').map(parseLine)
  );
}
