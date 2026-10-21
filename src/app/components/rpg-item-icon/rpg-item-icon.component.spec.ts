import { TestBed } from '@angular/core/testing';
import { RpgItemIconComponent } from './rpg-item-icon.component';

describe('RpgItemIconComponent(front#345)', () => {
  const render = (icon: string, image: string | null) => {
    const fixture = TestBed.createComponent(RpgItemIconComponent);
    fixture.componentRef.setInput('icon', icon);
    fixture.componentRef.setInput('image', image);
    fixture.detectChanges();
    return fixture;
  };

  it('画像がなければ絵文字を出す', () => {
    const el = render('🧪', null).nativeElement as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent?.trim()).toBe('🧪');
  });

  it('画像があれば画像を出し、読めなければ絵文字に戻す。画像を差し替えると、もう一度読む', () => {
    const fixture = render('🧪', 'http://localhost/rpg-item-images/a.png');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img')?.getAttribute('src')).toBe('http://localhost/rpg-item-images/a.png');

    el.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent?.trim()).toBe('🧪');

    fixture.componentRef.setInput('image', 'http://localhost/rpg-item-images/b.png');
    fixture.detectChanges();
    expect(el.querySelector('img')?.getAttribute('src')).toBe('http://localhost/rpg-item-images/b.png');
  });
});
