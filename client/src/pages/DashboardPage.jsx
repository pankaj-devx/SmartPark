import { BadgeCheck, UserRound } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth.js';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-md bg-brand-50 p-3 text-brand-700">
            <UserRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Welcome, {user?.name}</h1>
            <p className="mt-2 text-slate-600">Your authenticated SmartPark dashboard is ready.</p>
          </div>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-4">
            <dt className="text-sm text-slate-500">Email</dt>
            <dd className="mt-1 font-medium text-slate-950">{user?.email}</dd>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <dt className="text-sm text-slate-500">Role</dt>
            <dd className="mt-1 font-medium capitalize text-slate-950">{user?.role}</dd>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <dt className="text-sm text-slate-500">Status</dt>
            <dd className="mt-1 inline-flex items-center gap-1 font-medium capitalize text-brand-700">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              {user?.status}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

