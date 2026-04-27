import Dashboard from '@/components/dashboard';
import { Role } from '@/lib/types';

const allowedRoles: Role[] = ['lako', 'tulajdonos', 'kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo'];

export default function HomePage({ searchParams }: { searchParams?: { role?: string } }) {
  const roleParam = searchParams?.role;
  const role = allowedRoles.includes(roleParam as Role) ? (roleParam as Role) : 'lako';

  return <Dashboard role={role} />;
}
