import React from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Box, 
  Container, 
  AppBar, 
  Toolbar, 
  Typography 
} from '@mui/material';
import ChatProvider from './context/ChatContext';
import FileUpload from './components/FileUpload';
import ChatWindow from './components/ChatWindow';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

// Header component
const Header = () => (
  <AppBar position="static">
    <Toolbar>
      <Typography variant="h6" component="div">
        PDF Chat Assistant
      </Typography>
    </Toolbar>
  </AppBar>
);

// Main App
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container component="main" sx={{ flex: 1, py: 3 }}>
          <ChatProvider>
            <FileUpload />
            <ChatWindow />
          </ChatProvider>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
