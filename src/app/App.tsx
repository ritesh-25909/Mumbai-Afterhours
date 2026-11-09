import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './router';
import { useEffect } from 'react';
import { captureReferralFromUrl } from '../features/referrals/api';
export default function App() {
  useEffect(() => { captureReferralFromUrl(); }, []);
  return <Providers><RouterProvider router={router} /></Providers>;
}
