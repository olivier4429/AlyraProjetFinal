import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ContractAddressesProvider } from "./contexts/ContractAddressesContext";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import InscriptionPage from "./pages/InscriptionPage";
import DepositPage from "./pages/DepositPage";
import ValidationPage from "./pages/ValidationPage";
import ExplorerPage from "./pages/ExplorerPage";

function App() {
  return (
    <BrowserRouter>
      <ContractAddressesProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/audits" element={<ExplorerPage />} />
          <Route path="/inscription" element={<InscriptionPage />} />
          <Route path="/depot" element={<DepositPage />} />
          <Route path="/validation" element={<ValidationPage />} />
        </Routes>
      </Layout>
      </ContractAddressesProvider>
    </BrowserRouter>
  );
}

export default App;
