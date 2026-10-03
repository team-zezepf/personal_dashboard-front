import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface BottomTab {
  label: string;
  icon: string;
  path: string;
  exact: boolean;
}

// Android版(オフライン)の画面切り替え。PC 版のヘッダーのメニューの代わりに、画面下に固定で表示する(front#184)
const TABS: BottomTab[] = [
  { label: 'Dashboard', icon: '🏠', path: '/', exact: true },
  { label: '資格学習', icon: '📘', path: '/study', exact: false },
  { label: '設定', icon: '⚙', path: '/settings', exact: false }
];

@Component({
  selector: 'app-bottom-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-tabs.component.html',
  styleUrl: './bottom-tabs.component.css'
})
export class BottomTabsComponent {
  readonly tabs = TABS;
}
