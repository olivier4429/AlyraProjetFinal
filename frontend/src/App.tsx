import { useConnection } from 'wagmi'
function App() {
  const { address, isConnected } = useConnection();

  return (
    <div className="app">
      <header>
        <h1>AuditRegistry</h1>
        <div className="wallet">
          <appkit-network-button />
          <appkit-button />
        </div>
      </header>

      <main>
        {isConnected ? (
          <p>Connecté : {address}</p>
        ) : (
          <p>Connectez votre wallet pour commencer.</p>
        )}
      </main>
    </div>
  );
}

export default App;
