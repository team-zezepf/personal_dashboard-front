import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { BottomTabsComponent } from './components/bottom-tabs/bottom-tabs.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomTabsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Android版(オフライン)だけ、画面下にタブを出す
  readonly offline = environment.offline;

  constructor() {
    // 起動時にテーマを適用し、以降はログイン中の利用者のテーマに合わせて自動で切り替える
    inject(ThemeService);
  }
}
