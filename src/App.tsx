import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlannerPage from './pages/PlannerPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlannerPage />
    </QueryClientProvider>
  );
}
