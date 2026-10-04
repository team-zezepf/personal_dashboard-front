import { API_URL, E2E_ACCOUNT, E2E_DATA_PREFIX, FRONT_URL } from './env';

/**
 * テストを始める前に1回だけ実行する。
 * 1. sandbox が起動しているかを確かめる(起動していなければ、起動のしかたを出して止める)
 * 2. E2E 専用のアカウントがなければ作る
 * 3. 前回の実行で失敗して残った、E2E のデータ(タイトルが [E2E] で始まる予定・つぶやき)を消す
 */
export default async function globalSetup(): Promise<void> {
  await assertReachable(FRONT_URL, 'フロント');
  await assertReachable(`${API_URL}/api/auth/login`, 'API');

  const token = await loginOrRegister();
  await removeLeftovers(token);
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

async function login(): Promise<string | null> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_ACCOUNT.email, password: E2E_ACCOUNT.password })
  });
  return res.ok ? ((await res.json()) as { token: string }).token : null;
}

async function loginOrRegister(): Promise<string> {
  const token = await login();
  if (token) return token;

  const form = new FormData();
  form.append('email', E2E_ACCOUNT.email);
  form.append('name', E2E_ACCOUNT.name);
  form.append('password', E2E_ACCOUNT.password);
  form.append('passwordConfirm', E2E_ACCOUNT.password);
  const res = await fetch(`${API_URL}/api/auth/register`, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`E2E 専用のアカウント(${E2E_ACCOUNT.email})を作れませんでした: ${res.status} ${await res.text()}`);
  }
  return ((await res.json()) as { token: string }).token;
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
