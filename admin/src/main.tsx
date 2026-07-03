import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            // Admin data changes only via this dashboard — 30s of staleness is
            // safe and avoids refetching lists on every route navigation.
            staleTime: 30_000,
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={(window as any).__BASE_PATH__ || '/'}>
                <App />
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>
);
