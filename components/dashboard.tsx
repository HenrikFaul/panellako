import { getDashboardData } from '@/lib/data';
import { Role } from '@/lib/types';
import DashboardClient from './dashboard-client';

export default async function Dashboard({ role = 'lako' }: { role?: Role }) {
  const data = await getDashboardData(role);
  return <DashboardClient data={data} />;
}
