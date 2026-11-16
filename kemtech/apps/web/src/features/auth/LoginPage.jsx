import { useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import Logo from '@/shared/components/Logo.jsx';
import Spinner from '@/shared/components/Spinner.jsx';
import Icon from '@/shared/components/Icon.jsx';
import PasswordInput from '@/shared/components/PasswordInput.jsx';
import GoogleButton from './GoogleButton.jsx';
import { useAuthConfig, useGoogleLogin, usePasswordLogin } from './queries.js';

/** Full-screen sign-in: Google, or email/password for accounts an admin created (and the env admin). */
export default function LoginPage() {
  const { data: cfg, isLoading } = useAuthConfig();
  const nav = useNavigate();
  const toToday = { onSuccess: () => nav({ to: '/', replace: true }) }; // after sign-in always land on Today
  const google = useGoogleLogin();
  const admin = usePasswordLogin();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const onCredential = useCallback((c) => google.mutate(c, toToday), [google.mutate]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    admin.mutate(form, toToday);
  };
  const error = (google.error ?? admin.error)?.message;

  return (
    <div className="auth-page">
      <span className="auth-blob b1" /><span className="auth-blob b2" /><span className="auth-blob b3" />
      {(google.isPending || admin.isPending || isLoading) && <Spinner overlay label="Đang xử lý…" />}
      <div className="auth-card card">
        <div className="auth-logo"><Logo size={44} /></div>
        <h1 className="auth-title">Chào mừng trở lại</h1>
        <p className="muted center">Học technical mỗi ngày, vừa học vừa chơi.</p>
        {cfg?.googleClientId ? (
          <GoogleButton clientId={cfg.googleClientId} onCredential={onCredential} />
        ) : (
          !isLoading && (
            // Google sign-in is always offered; without GOOGLE_CLIENT_ID it is shown disabled with a hint
            <div className="stack" style={{ gap: 6 }}>
              <button type="button" className="google-fallback" disabled title="Chưa cấu hình GOOGLE_CLIENT_ID">
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
                Đăng nhập với Google
              </button>
              <p className="muted small center">Chưa bật: admin cần điền GOOGLE_CLIENT_ID trong .env.</p>
            </div>
          )
        )}
        <div className="auth-sep"><span>hoặc dùng mật khẩu</span></div>
        <form className="form-card stack" onSubmit={submit} style={{ padding: 0 }}>
          <label className="field"><span>Email</span>
            <span className="input-ic"><Icon name="mail" plain size={18} /><input type="text" value={form.identifier} onChange={set('identifier')} autoComplete="username" placeholder="Email hoặc tên tài khoản" required /></span>
          </label>
          <label className="field"><span>Mật khẩu</span>
            <span className="input-ic"><Icon name="lock" plain size={18} /><PasswordInput value={form.password} onChange={set('password')} autoComplete="current-password" placeholder="Nhập mật khẩu" required /></span>
          </label>
          <button className="btn" type="submit" disabled={admin.isPending}>Đăng nhập</button>
        </form>
        {error && <p className="err center">{error}</p>}
      </div>
    </div>
  );
}
