import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminSession, clearAdminSession } from '@/utils/storage';
import { Header } from '@/components/Header';
import { AdminPanel } from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap } from 'lucide-react';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const session = getAdminSession();
    setIsAuthenticated(session.isAuthenticated);
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleNuclearRefresh = useCallback(() => {
    // Force complete page reload
    window.location.reload();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Akses tidak diizinkan</p>
          <Button onClick={() => navigate('/')}>Kembali ke Beranda</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>
        
        <AdminPanel key={refreshKey} />
      </main>
    </div>
  );
};

export default Admin;