import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import InscriptionPage from "./pages/InscriptionPage";
import DepositPage from "./pages/DepositPage";
import ValidationPage from "./pages/ValidationPage";
import ExplorerPage from "./pages/ExplorerPage";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/inscription" element={<InscriptionPage />} />
          <Route path="/depot" element={<DepositPage />} />
          <Route path="/validation" element={<ValidationPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
