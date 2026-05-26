import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading,
    className = '',
    disabled,
    ...props
}) => {
    return (
        <button className={`${styles.btn} ${styles[variant]} ${className}`} disabled={isLoading || disabled} {...props}>
            {isLoading && <span className={styles.loader}></span>}
            {children}
        </button>
    );
};
