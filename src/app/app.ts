import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor() {
    // 起動時にテーマを適用し、以降はログイン中の利用者のテーマに合わせて自動で切り替える
    inject(ThemeService);
  }
}
