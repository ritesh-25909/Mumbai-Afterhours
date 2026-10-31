import { NavLink } from 'react-router-dom';
const cls = ({ isActive }: { isActive: boolean }) => `rounded-lg px-4 py-2 font-semibold ${isActive ? 'bg-ink text-white' : 'bg-white border border-line'}`;
export const ModerationNav = () => (
  <nav className="mb-4 flex gap-2" aria-label="Moderation"><NavLink end to="/moderation" className={cls}>Verification</NavLink><NavLink to="/moderation/reports" className={cls}>Reports</NavLink></nav>
);
