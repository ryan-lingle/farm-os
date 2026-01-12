import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Locations from "./pages/Locations";
import Records from "./pages/Records";
import Assets from "./pages/records/Assets";
import AssetDetail from "./pages/records/AssetDetail";
import LocationDetail from "./pages/records/LocationDetail";
import Logs from "./pages/records/Logs";
import Animals from "./pages/records/assets/Animals";
import Equipment from "./pages/records/assets/Equipment";
import Plants from "./pages/records/assets/Plants";
import Compost from "./pages/records/assets/Compost";
import Harvest from "./pages/records/logs/Harvest";
import Input from "./pages/records/logs/Input";
import Activity from "./pages/records/logs/Activity";
import Observation from "./pages/records/logs/Observation";
import Maintenance from "./pages/records/logs/Maintenance";
import Tasks from "./pages/tasks/Tasks";
import TaskPage from "./pages/tasks/TaskPage";
import Plans from "./pages/tasks/Plans";
import PlanDetail from "./pages/tasks/PlanDetail";
import Cycles from "./pages/tasks/Cycles";
import Chat from "./pages/Chat";
import { ChatContainer } from "./components/chat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <header className="h-14 border-b flex items-center px-4 bg-background">
                <SidebarTrigger />
                <div className="ml-4">
                  <h1 className="text-lg font-semibold text-foreground">farmOS</h1>
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/locations" element={<Locations />} />
                  <Route path="/locations/:id" element={<LocationDetail />} />
                  <Route path="/records" element={<Records />} />
                  <Route path="/records/assets" element={<Assets />} />
                  <Route path="/records/assets/:assetType" element={<Animals />} />
                  <Route path="/records/assets/:assetType/:id" element={<AssetDetail />} />
                  <Route path="/records/assets/animals" element={<Animals />} />
                  <Route path="/records/assets/equipment" element={<Equipment />} />
                  <Route path="/records/assets/plants" element={<Plants />} />
                  <Route path="/records/assets/compost" element={<Compost />} />
                  <Route path="/records/logs" element={<Logs />} />
                  <Route path="/records/logs/harvest" element={<Harvest />} />
                  <Route path="/records/logs/input" element={<Input />} />
                  <Route path="/records/logs/activity" element={<Activity />} />
                  <Route path="/records/logs/observation" element={<Observation />} />
                  <Route path="/records/logs/maintenance" element={<Maintenance />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/tasks/:id" element={<TaskPage />} />
                  <Route path="/tasks/plans" element={<Plans />} />
                  <Route path="/tasks/plans/:id" element={<PlanDetail />} />
                  <Route path="/tasks/cycles" element={<Cycles />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:id" element={<Chat />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <ChatContainer />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
