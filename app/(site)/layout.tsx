import Link from "next/link";
import { CreditCard, LayoutDashboard, Plus } from "lucide-react";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <nav
        aria-label="Primary"
        className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 shadow-[0_1px_0_rgb(15_23_42/0.04)]"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-[3.75rem]">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-xl pr-2 -ml-1 pl-1 py-1 hover:bg-slate-50/80 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/25 ring-1 ring-white/20">
                <CreditCard
                  className="w-[18px] h-[18px] text-white"
                  strokeWidth={2.25}
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-semibold text-slate-900 text-[15px] tracking-tight">
                  Mini Credit
                </span>
                <span className="text-[10px] font-medium text-slate-400 tracking-wide uppercase mt-0.5 hidden sm:block">
                  Credit applications
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/applications"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 rounded-xl transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/applications/new"
                className="inline-flex items-center gap-1.5 ml-0.5 px-3.5 py-2 text-[13px] font-semibold text-white bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-500/25 ring-1 ring-indigo-500/20"
              >
                <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                <span className="hidden sm:inline">New application</span>
                <span className="sm:hidden">New</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main id="main-content" className="flex-1 min-h-0">
        {children}
      </main>
    </>
  );
}
