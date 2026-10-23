import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { API_URL, E2E_ACCOUNT, E2E_ADMIN_ACCOUNT, E2E_DATA_PREFIX, E2E_MATE_ACCOUNT, FRONT_URL, SANDBOX_DATA_DIR } from './env';
import { useRpgFixture } from './rpg-fixture';

/**
 * テストを始める前に1回だけ実行する。
 * 1. sandbox が起動しているかを確かめる(起動していなければ、起動のしかたを出して止める)
 * 2. E2E 専用のアカウント・管理者のアカウント(front#341)がなければ作る
 * 3. 前回の実行で失敗して残った、E2E のデータ(タイトルが [E2E] で始まる予定・つぶやき)を消す
 * 4. sandbox の RPG データを、E2E 用のデータ(e2e/fixtures/rpg/)に置き換え、セーブデータは空にする(front#366)。終わったら global-teardown で元に戻す(front#260)
 */
export default async function globalSetup(): Promise<void> {
  await assertReachable(FRONT_URL, 'フロント');
  await assertReachable(`${API_URL}/api/auth/login`, 'API');

  const token = await loginOrRegister();
  await ensureAdmin();
  await ensureMate();
  await removeLeftovers(token);
  useRpgFixture();
}

async function assertReachable(url: string, label: string): Promise<void> {
  try {
    await fetch(url, { method: 'GET' });
  } catch {
    throw new Error(
      `sandbox の${label}(${url})に接続できません。start-sandbox.bat で sandbox を起動してから、もう一度実行してください。`
    );
  }
}

type Account = typeof E2E_ACCOUNT;

async function login(account: Account): Promise<string | null> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password })
  });
  return res.ok ? ((await res.json()) as { token: string }).token : null;
}

async function loginOrRegister(account: Account = E2E_ACCOUNT): Promise<string> {
  const token = await login(account);
  if (token) return token;

  const form = new FormData();
  form.append('email', account.email);
  form.append('name', account.name);
  form.append('password', account.password);
  form.append('passwordConfirm', account.password);
  const res = await fetch(`${API_URL}/api/auth/register`, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`E2E 専用のアカウント(${account.email})を作れませんでした: ${res.status} ${await res.text()}`);
  }
  return ((await res.json()) as { token: string }).token;
}

/**
 * 管理者の画面を確かめる E2E 専用のアカウント(front#341)がなければ作り、管理者(ADMIN)にする。
 * ロールを変える API はないので、sandbox の users.json を書きかえる(API はロールを毎回 users.json から読む)
 */
/** RPGの仲間の役のアカウント(front#358)がなければ作る(ログインだけなら、集会場で呼べなくなることはない) */
async function ensureMate(): Promise<void> {
  await loginOrRegister(E2E_MATE_ACCOUNT);
}

async function ensureAdmin(): Promise<void> {
  await loginOrRegister(E2E_ADMIN_ACCOUNT);
  const file = path.join(SANDBOX_DATA_DIR, 'users.json');
  const users = JSON.parse(readFileSync(file, 'utf8')) as { email: string; role: string }[];
  const admin = users.find((u) => u.email === E2E_ADMIN_ACCOUNT.email);
  if (!admin) throw new Error(`E2E 専用の管理者アカウント(${E2E_ADMIN_ACCOUNT.email})が sandbox の users.json に見つかりません`);
  if (admin.role === 'ADMIN') return;
  admin.role = 'ADMIN';
  writeFileSync(file, JSON.stringify(users, null, 2), 'utf8');
}

async function graphql<T>(token: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  const body = (await res.json()) as { data: T; errors?: unknown };
  if (body.errors) throw new Error(`GraphQL のエラー: ${JSON.stringify(body.errors)}`);
  return body.data;
}

async function removeLeftovers(token: string): Promise<void> {
  const { schedules, tasks, timelinePosts } = await graphql<{
    schedules: { id: string; title: string }[];
    tasks: { id: string; title: string }[];
    timelinePosts: { id: string; body: string }[];
  }>(token, '{ schedules { id title } tasks { id title } timelinePosts(filter: MINE) { id body } }');

  const isLeftover = (text: string) => text.startsWith(E2E_DATA_PREFIX);
  for (const s of schedules.filter((s) => isLeftover(s.title))) {
    await graphql(token, 'mutation($id: ID!) { deleteSchedule(id: $id) }', { id: s.id });
  }
  for (const t of tasks.filter((t) => isLeftover(t.title))) {
    await graphql(token, 'mutation($id: ID!) { deleteTask(id: $id) }', { id: t.id });
  }
  for (const p of timelinePosts.filter((p) => isLeftover(p.body))) {
    await graphql(token, 'mutation($id: ID!) { deletePost(id: $id) }', { id: p.id });
  }
}
