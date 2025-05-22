import React from "react";
import Button from "@mui/material/Button";

const AppButton = ({ children, onClick, variant = "contained", color = "inherit", ...props }) => (
    <Button variant={variant} color={color} onClick={onClick} {...props}>
        {children}
    </Button>
);

export default AppButton;