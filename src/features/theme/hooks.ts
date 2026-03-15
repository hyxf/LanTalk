import { useEffect } from 'react';
import { useThemeStore } from './store';

export const useThemeEffect = () => {
    const theme = useThemeStore((state) => state.theme);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }, [theme]);
};
