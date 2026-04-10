import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import InscriptionPage from "./pages/InscriptionPage";
import DepositPage from "./pages/DepositPage";
import ValidationPage from "./pages/ValidationPage";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/inscription" element={<InscriptionPage />} />
          <Route path="/depot" element={<DepositPage />} />
          <Route path="/validation" element={<ValidationPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
