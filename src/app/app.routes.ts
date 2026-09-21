import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
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

export const routes: Routes = [
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
  { path: 'achievements', component: AchievementsPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
