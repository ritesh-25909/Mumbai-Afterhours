import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { myRoles } from '../../features/verification/api';

const cls = ({ isActive }: { isActive: boolean }) => `rounded-lg px-4 py-2 font-semibold ${isActive ? 'bg-ink text-white' : 'bg-white text-ink border border-line'}`;

export const SettingsNav = () => {
  const [canAdmin, setCanAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    myRoles().then(roles => {
      if (active) setCanAdmin(roles.includes('admin') || roles.includes('super_admin'));
    }).catch(() => { if (active) setCanAdmin(false); });
    return () => { active = false; };
  }, []);

  return (
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Settings">
      <NavLink end to="/settings" className={cls}>Account</NavLink>
      <NavLink to="/settings/privacy" className={cls}>Privacy</NavLink>
      <NavLink to="/settings/referrals" className={cls}>Mumbai Afterhours referrals</NavLink>
      {canAdmin && <NavLink to="/admin" className={cls}>Admin Panel</NavLink>}
    </nav>
  );
};
