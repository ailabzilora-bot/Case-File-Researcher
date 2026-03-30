import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Briefcase, Settings, Search, Bell, User, Folder, FileText, MessageSquare, Archive, HelpCircle, Sparkles, Bot, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCases } from '@/hooks/useCases';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { createCase } = useCases();

  const handleNewCase = () => {
    const newCaseId = createCase();
    navigate(`/case/${newCaseId}`);
  };

  const tabs = [
    { name: 'Case File Research', path: '/', icon: FileSearch },
    { name: 'Digital Library', path: '/library', icon: FileText },
    { name: 'Firm Assistant', path: '/assistant', icon: Bot },
  ];

  return (
    <div className="flex h-screen bg-[#FDFCFE] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-purple-100/50 bg-white flex flex-col justify-between z-20 flex-shrink-0">
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3 px-2 py-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9300FF] text-white shadow-sm">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight text-slate-900">Legal Intelligence</h2>
              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">AI-Powered Counsel</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path || (tab.path === '/' && location.pathname.startsWith('/case'));
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.name}
                  to={tab.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all',
                    isActive
                      ? 'bg-[#9300FF] text-white shadow-md shadow-purple-200'
                      : 'text-slate-500 hover:bg-purple-50 hover:text-purple-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 space-y-1.5 mb-4">
          <Link to="/archive" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-purple-50 hover:text-purple-900 transition-all">
            <Archive className="h-4 w-4" />
            Archive
          </Link>
          <Link to="/support" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-purple-50 hover:text-purple-900 transition-all">
            <HelpCircle className="h-4 w-4" />
            Support
          </Link>
          <Link to="/deep-research" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#9300FF] bg-purple-50 hover:bg-purple-100 transition-all mt-4">
            <Sparkles className="h-4 w-4" />
            Deep Research
          </Link>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Background gradient blob */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-purple-200/30 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-pink-200/30 blur-[120px]" />
        </div>

        {/* Topbar */}
        <header className="h-20 border-b border-purple-100/50 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10 flex-shrink-0">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-slate-900 mr-12">The Luminous Counsel</h1>
            <nav className="hidden md:flex items-center gap-8">
              {tabs.map((tab) => {
                const isActive = location.pathname === tab.path || (tab.path === '/' && location.pathname.startsWith('/case'));
                return (
                  <Link
                    key={tab.name}
                    to={tab.path}
                    className={cn(
                      'text-sm font-semibold transition-all py-7 border-b-2',
                      isActive
                        ? 'text-[#9300FF] border-[#9300FF]'
                        : 'text-slate-500 border-transparent hover:text-slate-900'
                    )}
                  >
                    {tab.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search cases..." 
                className="pl-9 bg-slate-100/50 border-none rounded-full h-10 focus-visible:ring-1 focus-visible:ring-purple-300"
              />
            </div>
            <Button onClick={handleNewCase} className="bg-[#9300FF] hover:bg-purple-700 text-white rounded-full px-6 h-10 font-semibold shadow-md shadow-purple-200">
              New Case
            </Button>
            <div className="flex items-center gap-2 ml-2 border-l border-slate-200 pl-4">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 rounded-full">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 rounded-full">
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-teal-400 rounded-full bg-slate-900 ml-1 hover:bg-slate-800 hover:text-teal-300">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
