import { TrpcProvider } from "@/providers/TrpcProvider";

function App() {
  return (
    <ErrorBoundary>
      <TrpcProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </TrpcProvider>
    </ErrorBoundary>
  );
}
