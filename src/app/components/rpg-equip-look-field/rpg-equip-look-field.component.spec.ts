import { TestBed } from '@angular/core/testing';
import { EquipLookValue, RpgEquipLookFieldComponent } from './rpg-equip-look-field.component';

describe('RpgEquipLookFieldComponent(front#431)', () => {
  const render = (type: 'weapon' | 'armor', shape: string | null, color: string | null = null, accent: string | null = null) => {
    const fixture = TestBed.createComponent(RpgEquipLookFieldComponent);
    fixture.componentRef.setInput('type', type);
    fixture.componentRef.setInput('shape', shape);
    fixture.componentRef.setInput('color', color);
    fixture.componentRef.setInput('accent', accent);
    const changes: EquipLookValue[] = [];
    fixture.componentInstance.lookChange.subscribe((v) => changes.push(v));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const chips = () => [...el.querySelectorAll('.chip')].map((b) => b.textContent?.trim());
    const chip = (name: string) => [...el.querySelectorAll<HTMLButtonElement>('.chip')].find((b) => b.textContent?.trim() === name)!;
    return { el, changes, chips, chip };
  };

  it('武器の形は 見た目なし・片手剣・大剣・玉の杖・三日月の杖。形を選ぶと、その形の最初の色を入れる', () => {
    const { el, changes, chips, chip } = render('weapon', null);
    expect(chips()).toEqual(['見た目なし', '片手剣', '大剣', '玉の杖', '三日月の杖']);
    // 見た目なしのときは色を選べない
    expect(el.querySelector('.swatches')).toBeNull();
    chip('玉の杖').click();
    expect(changes.at(-1)).toEqual({ lookShape: 'staff', lookColor: '#8b5a2b', lookAccent: '#60a5fa' });
  });

  it('形を変えても選んでいた色は残り、見た目なしにすると色も消す', () => {
    const { changes, chip } = render('weapon', 'sword', '#a5f3fc', '#0e7490');
    chip('大剣').click();
    expect(changes.at(-1)).toEqual({ lookShape: 'greatsword', lookColor: '#a5f3fc', lookAccent: '#0e7490' });
    chip('見た目なし').click();
    expect(changes.at(-1)).toEqual({ lookShape: null, lookColor: null, lookAccent: null });
  });

  it('防具は服の7つから選べ、色の名前は「服の色」「飾りの色」。色の丸を押すと、その色にする', () => {
    const { el, changes, chips } = render('armor', 'robe', '#1e3a8a', '#fde047');
    expect(chips()).toEqual(['見た目なし', 'シャツ', 'ローブ', 'よろい', 'ワンピース', 'ベスト', 'パーカー', 'セーラー服']);
    expect(el.textContent).toContain('服の色');
    (el.querySelector('[aria-label="飾りの色 #ef4444"]') as HTMLButtonElement).click();
    expect(changes.at(-1)).toEqual({ lookShape: 'robe', lookColor: '#1e3a8a', lookAccent: '#ef4444' });
  });
});
