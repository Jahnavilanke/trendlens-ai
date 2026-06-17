import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CampaignProvider } from "@/lib/store";
import { FilterProvider } from "@/lib/filters";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import ExecutivePage from "@/pages/executive";
import ChannelsPage from "@/pages/channels";
import CampaignsPage from "@/pages/campaigns";
import AudiencePage from "@/pages/audience";
import ForecastingPage from "@/pages/forecasting";
import InsightsPage from "@/pages/insights";
import UploadPage from "@/pages/upload";
import SettingsPage from "@/pages/settings";
import AboutPage from "@/pages/about";

export default function App() {
  return (
    <CampaignProvider>
      <FilterProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/executive" element={<ExecutivePage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/audience" element={<AudiencePage />} />
              <Route path="/forecasting" element={<ForecastingPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </FilterProvider>
    </CampaignProvider>
  );
}
