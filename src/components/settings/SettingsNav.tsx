
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

import { myRoles } from '../../features/verification/api';

const cls = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition-colors ${
    isActive
      ? 'bg-ink text-white'
      : 'border border-line bg-white text-ink hover:bg-slate-50'
  }`;

export const SettingsNav = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminRole() {
      try {
        const roles = await myRoles();

        if (cancelled) return;

        setIsAdmin(
          roles.includes('admin') ||
          roles.includes('super_admin') ||
          roles.includes('moderator')
        );
      } catch (error) {
        console.error('Could not verify admin navigation:', error);

        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    }

    void checkAdminRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav
      className="mb-5 flex flex-wrap gap-2"
      aria-label="Settings"
    >
      <NavLink end to="/settings" className={cls}>
        Account
      </NavLink>

      <NavLink to="/settings/privacy" className={cls}>
        Privacy
      </NavLink>

      {isAdmin && (
        <NavLink to="/admin" className={cls}>
          <ShieldCheck size={17} />
          Admin Panel
        </NavLink>
      )}
    </nav>
  );
};
