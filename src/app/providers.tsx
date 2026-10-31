import type { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/AuthProvider';
export const Providers = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
