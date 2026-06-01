"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import StorageManager from "@/shared/utils/storageManager";

interface ThemeContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    isHydrated: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const storedPreference = StorageManager.getItem("darkMode");
                const darkModePreference =
                    storedPreference === null ? true : storedPreference === "true";
                setIsDarkMode(darkModePreference);
                StorageManager.setItem(
                    "darkMode",
                    darkModePreference ? "true" : "false"
                );
                if (darkModePreference) {
                    document.documentElement.setAttribute("data-theme", "dark");
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.setAttribute(
                        "data-theme",
                        "light"
                    );
                    document.documentElement.classList.remove("dark");
                }
            } catch (e) {
                setIsDarkMode(false);
            } finally {
                setIsHydrated(true);
            }
        }
    }, []);

    const toggleDarkMode = () => {
        try {
            const newDarkMode = !isDarkMode;
            setIsDarkMode(newDarkMode);
            if (newDarkMode) {
                document.documentElement.setAttribute("data-theme", "dark");
                document.documentElement.classList.add("dark");
                StorageManager.setItem("darkMode", "true");
            } else {
                document.documentElement.setAttribute("data-theme", "light");
                document.documentElement.classList.remove("dark");
                StorageManager.setItem("darkMode", "false");
            }
        } catch (e) {
            // Silent error handling for production
        }
    };

    return (
        <ThemeContext.Provider
            value={{ isDarkMode, toggleDarkMode, isHydrated }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
