import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';

const Header: React.FC = () => {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Box display="flex" alignItems="center">
          <Typography variant="h6" component="div">
            PDF Chat Assistant
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 