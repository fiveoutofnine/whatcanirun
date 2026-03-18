import NavBar from '@/components/common/nav-bar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex grow flex-col">
      <NavBar />
      {children}
    </main>
  );
}
