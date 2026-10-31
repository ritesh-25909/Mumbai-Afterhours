import { NavLink } from 'react-router-dom';
const cls = ({ isActive }: { isActive: boolean }) => `rounded-lg px-4 py-2 font-semibold ${isActive ? 'bg-ink text-white' : 'bg-white text-ink border border-line'}`;
export const SettingsNav = () => (
  <nav className="mb-5 flex gap-2" aria-label="Settings"><NavLink end to="/settings" className={cls}>Account</NavLink><NavLink to="/settings/privacy" className={cls}>Privacy</NavLink></nav>
);
