import { TestBed } from '@angular/core/testing';
import { RpgLook } from '../../models/rpg.models';
import { DEFAULT_LOOK } from '../../rpg/rpg-look';
import { RpgLookEditorComponent } from './rpg-look-editor.component';

describe('RpgLookEditorComponent(front#362)', () => {
  // 見た目を渡して描き、選んだ見た目(lookChange)を集める
  const render = (look: RpgLook) => {
    const fixture = TestBed.createComponent(RpgLookEditorComponent);
    fixture.componentRef.setInput('look', look);
    const changes: RpgLook[] = [];
    fixture.componentInstance.lookChange.subscribe((l) => changes.push(l));
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, changes };
  };
  const click = (el: HTMLElement, label: string) => (el.querySelector(`[aria-label="${label}"]`) as HTMLElement).click();
  const row = (el: HTMLElement, label: string) => el.querySelector(`.row[aria-label="${label}"]`) as HTMLElement;

  it('部品は1行ずつ「名前 < 部品 > 」で出し、< > で前・次の部品にする。端まで行くと反対の端へ戻る', () => {
    const { el, changes } = render(DEFAULT_LOOK);
    expect(row(el, '髪型').querySelector('.name')?.textContent).toContain('ショート');
    expect(row(el, '髪型').querySelector('.count')?.textContent?.trim()).toBe('1 / 11');

    click(el, '髪型 次へ');
    expect(changes.at(-1)?.hair).toBe('long');
    // 最初の部品で「前へ」を押すと、最後の部品(サイドテール)になる
    click(el, '髪型 前へ');
    expect(changes.at(-1)?.hair).toBe('sidetail');
  });

  it('眉を選ぶ前の見た目は「ふつう」・眉の色は「髪に合わせる」として出す', () => {
    const old: RpgLook = { ...DEFAULT_LOOK };
    delete old.brows;
    delete old.browColor;
    const { el } = render(old);
    expect(row(el, '眉').querySelector('.name')?.textContent).toContain('ふつう');
    expect(row(el, '眉').querySelector('.chip')?.textContent).toContain('髪に合わせる');
  });

  it('front#371 選べなくした目(キラキラ)の見た目は、目を「ふつう」として出す', () => {
    const { el } = render({ ...DEFAULT_LOOK, eyes: 'sparkle' });
    expect(row(el, '目').querySelector('.name')?.textContent).toContain('ふつう');
  });

  it('色の丸を押すと一覧が開き、色を選べる。眉の色は「髪の色に合わせる」で null に戻せる', () => {
    const { fixture, el, changes } = render({ ...DEFAULT_LOOK, browColor: '#1f2937' });
    (row(el, '眉').querySelector('.chip') as HTMLElement).click();
    fixture.detectChanges();
    expect(row(el, '眉').querySelector('.palette')).not.toBeNull();
    // 開いている眉の色の一覧で、今の色が選ばれている
    expect(el.querySelector('[aria-label="眉の色 #1f2937"]')?.getAttribute('aria-pressed')).toBe('true');

    click(el, '眉の色 #dc2626');
    expect(changes.at(-1)?.browColor).toBe('#dc2626');
    (row(el, '眉').querySelector('.auto-btn') as HTMLElement).click();
    expect(changes.at(-1)?.browColor).toBeNull();
  });

  it('一覧にない色はカスタムとして出し、カスタムで選んだ色をそのまま使う', () => {
    const { fixture, el, changes } = render({ ...DEFAULT_LOOK, hairColor: '#123456' });
    (row(el, '髪型').querySelector('.chip') as HTMLElement).click();
    fixture.detectChanges();
    const custom = row(el, '髪型').querySelector('.custom') as HTMLElement;
    expect(custom.classList).toContain('active');
    expect(custom.textContent).toContain('#123456');

    const input = el.querySelector('[aria-label="髪の色 カスタム"]') as HTMLInputElement;
    input.value = '#abcdef';
    input.dispatchEvent(new Event('input'));
    expect(changes.at(-1)?.hairColor).toBe('#abcdef');
  });
});
