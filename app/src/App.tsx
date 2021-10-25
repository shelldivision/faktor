import { Routes } from './routes';
import { BrowserRouter } from 'react-router-dom';
import { Web3Provider } from './components';

export default function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <Routes />
      </BrowserRouter>
    </Web3Provider>
  );
}
