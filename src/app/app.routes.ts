import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard.component';
import { UserListPageComponent } from './pages/user-list/user-list.component';
import { ToolListPageComponent } from './pages/tool-list/tool-list.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '', component: DashboardPageComponent, canActivate: [authGuard] },
  { path: 'users', component: UserListPageComponent, canActivate: [authGuard] },
  { path: 'tools', component: ToolListPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
