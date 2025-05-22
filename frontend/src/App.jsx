import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import './App.css';
import Home from './pages/Home';

function App() {
  return (
    <Container>
      <React.Suspense fallback={<Typography>Loading...</Typography>}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </React.Suspense>
    </Container>
  );
}

export default App;
