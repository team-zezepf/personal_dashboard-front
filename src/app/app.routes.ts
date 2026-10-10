import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { firstGenreOf } from './config/genre-content';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard.component';
import { UserListPageComponent } from './pages/user-list/user-list.component';
import { ToolListPageComponent } from './pages/tool-list/tool-list.component';
import { AccountEditPageComponent } from './pages/account-edit/account-edit.component';
import { ExamSubjectsPageComponent } from './pages/exam-subjects/exam-subjects.component';
import { ExamStudyPageComponent } from './pages/exam-study/exam-study.component';
import { AchievementsPageComponent } from './pages/achievements/achievements.component';
import { DeveloperQaPageComponent } from './pages/developer-qa/developer-qa.component';
import { MockExamPageComponent } from './pages/mock-exam/mock-exam.component';
import { MistakeReviewPageComponent } from './pages/mistake-review/mistake-review.component';
import { GenreStudyPageComponent } from './pages/genre-study/genre-study.component';
import { CardCollectionPageComponent } from './pages/card-collection/card-collection.component';
import { CardPacksPageComponent } from './pages/card-packs/card-packs.component';
import { CardAdminPageComponent } from './pages/card-admin/card-admin.component';
import { ThemeSettingsPageComponent } from './pages/theme-settings/theme-settings.component';
import { InterviewPrepListPageComponent } from './pages/interview-prep-list/interview-prep-list.component';
import { InterviewPrepEditPageComponent } from './pages/interview-prep-edit/interview-prep-edit.component';
import { TimelinePageComponent } from './pages/timeline/timeline.component';
import { PostThreadPageComponent } from './pages/post-thread/post-thread.component';
import { OfflineSettingsPageComponent } from './pages/offline-settings/offline-settings.component';
import { DataTransferPageComponent } from './pages/data-transfer/data-transfer.component';
import { RpgPageComponent } from './pages/rpg/rpg.component';
import { RpgAdminPageComponent } from './pages/rpg-admin/rpg-admin.component';
import { environment } from '../environments/environment';

const allRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: '', component: DashboardPageComponent, canActivate: [authGuard] },
  { path: 'users', component: UserListPageComponent, canActivate: [authGuard] },
  { path: 'tools', component: ToolListPageComponent, canActivate: [authGuard] },
  { path: 'account', component: AccountEditPageComponent, canActivate: [authGuard] },
  { path: 'study', component: ExamSubjectsPageComponent, canActivate: [authGuard] },
  { path: 'study/:examType', component: ExamStudyPageComponent, canActivate: [authGuard] },
  { path: 'study/:examType/mock-exam', component: MockExamPageComponent, canActivate: [authGuard] },
  { path: 'study/:examType/review', component: MistakeReviewPageComponent, canActivate: [authGuard] },
  // ジャンル選択画面はなくし、まとめページのサイドバーでジャンルを切り替える。以前のURLは先頭のジャンルへ転送する
  {
    path: 'study/:examType/genres',
    redirectTo: ({ params }) => {
      const first = firstGenreOf(params['examType']);
      return first ? `study/${params['examType']}/genre/${first.genreKey}` : 'study';
    }
  },
  { path: 'study/:examType/genre/:genreKey', component: GenreStudyPageComponent, canActivate: [authGuard] },
  { path: 'achievements', component: AchievementsPageComponent, canActivate: [authGuard] },
  { path: 'developer-qa', component: DeveloperQaPageComponent, canActivate: [authGuard] },
  { path: 'cards', component: CardCollectionPageComponent, canActivate: [authGuard] },
  { path: 'cards/packs', component: CardPacksPageComponent, canActivate: [authGuard] },
  { path: 'cards/admin', component: CardAdminPageComponent, canActivate: [authGuard] },
  { path: 'settings/theme', component: ThemeSettingsPageComponent, canActivate: [authGuard] },
  // PC 版と Android 版で予定・タスク・成績をやり取りする(PC 版はアバターメニュー、Android 版は設定タブから開く)
  { path: 'settings/data-transfer', component: DataTransferPageComponent, canActivate: [authGuard] },
  { path: 'interview-prep', component: InterviewPrepListPageComponent, canActivate: [authGuard] },
  { path: 'interview-prep/:id', component: InterviewPrepEditPageComponent, canActivate: [authGuard] },
  { path: 'timeline', component: TimelinePageComponent, canActivate: [authGuard] },
  { path: 'timeline/:id', component: PostThreadPageComponent, canActivate: [authGuard] },
  // アイソメトリックRPG(front#215)。PC向けのみで、Android版(OFFLINE_PATHS)には入れない
  { path: 'rpg', component: RpgPageComponent, canActivate: [authGuard] },
  // RPGのマップ作成(front#217)。管理者・開発者向け。保存していない変更があれば、離れる前に確かめる
  {
    path: 'rpg/admin',
    component: RpgAdminPageComponent,
    canActivate: [authGuard],
    canDeactivate: [(page: RpgAdminPageComponent) => page.confirmLeave()]
  },
  { path: '**', redirectTo: '' }
];

// Android版(オフライン)で使う画面。Dashboard・資格学習と、画面下のタブの「設定」だけにする(front#184)。
// ログイン画面も出さない(起動時にログイン済みの状態にする)。ここにない画面を開こうとしたら Dashboard に戻す
const OFFLINE_PATHS = new Set([
  '',
  'study',
  'study/:examType',
  'study/:examType/mock-exam',
  'study/:examType/review',
  'study/:examType/genres',
  'study/:examType/genre/:genreKey',
  'achievements',
  'settings/theme',
  'settings/data-transfer'
]);

const offlineRoutes: Routes = [
  ...allRoutes.filter(r => OFFLINE_PATHS.has(r.path ?? '')),
  { path: 'settings', component: OfflineSettingsPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];

export const routes: Routes = environment.offline ? offlineRoutes : allRoutes;
