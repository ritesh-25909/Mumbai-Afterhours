import { NavLink, useLocation } from 'react-router-dom';

const cls = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-4 py-2 font-semibold ${isActive ? 'bg-ink text-white' : 'bg-white border border-line'}`;

export const ModerationNav = () => {
  const { pathname } = useLocation();
  const inAdminCenter = pathname.startsWith('/admin/');
  const verificationPath = inAdminCenter ? '/admin/moderation' : '/moderation';
  const reportsPath = inAdminCenter ? '/admin/reports' : '/moderation/reports';

  return (
    <nav className="mb-4 flex flex-wrap gap-2" aria-label="Moderation">
      <NavLink end to={verificationPath} className={cls}>Verification</NavLink>
      <NavLink to={reportsPath} className={cls}>Reports</NavLink>
    </nav>
  );
};
