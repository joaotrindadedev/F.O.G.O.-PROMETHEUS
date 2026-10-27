import AppRoutes from './routes/Routes';
import { ProvedorSessao } from './contexts/Sessao';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <ProvedorSessao>
      <TooltipProvider>
        <AppRoutes />
        <Toaster richColors position="bottom-right" closeButton />
      </TooltipProvider>
    </ProvedorSessao>
  );
}
