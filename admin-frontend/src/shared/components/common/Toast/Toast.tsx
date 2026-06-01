import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Toast.module.css";

interface ToastProps {
    message: string;
    visible: boolean;
    type?: "success" | "error" | "info" | "warning";
    onClose: () => void;
    variant?: "toast" | "inline";
    position?: "bottom-left" | "top-right" | "top-center" | "bottom-center";
    autoClose?: boolean;
    autoCloseDelay?: number;
    showCloseButton?: boolean;
    className?: string;
    title?: string;
    darkMode?: boolean;
}

const Toast: React.FC<ToastProps> = ({
    message,
    visible,
    type = "success",
    onClose,
    variant = "toast",
    position = "bottom-left",
    autoClose = true,
    autoCloseDelay = 3000,
    showCloseButton = true,
    className = "",
    title,
    darkMode = false,
}) => {
    React.useEffect(() => {
        if (visible && autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, autoCloseDelay);
            return () => clearTimeout(timer);
        }
    }, [visible, autoClose, autoCloseDelay, onClose]);

    // Get default title based on type
    const getDefaultTitle = () => {
        switch (type) {
            case "success":
                return "Success";
            case "error":
                return "Error";
            case "info":
                return "Informative";
            case "warning":
                return "Warning";
            default:
                return "Notification";
        }
    };

    const icons = {
        success: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3.5}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                />
            </svg>
        ),
        error: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3.5}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        ),
        info: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3.5}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        ),
        warning: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3.5}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
            </svg>
        ),
    };

    // Build CSS classes dynamically
    const getTypeClassName = () => {
        switch (type) {
            case "success":
                return styles.toastSuccess;
            case "error":
                return styles.toastError;
            case "info":
                return styles.toastInfo;
            case "warning":
                return styles.toastWarning;
            default:
                return styles.toastSuccess;
        }
    };

    const containerClass = `
    ${styles.toastNotification} 
    ${getTypeClassName()} 
    ${styles[variant]} 
    ${variant === "toast" ? styles[position] : ""} 
    ${darkMode ? styles.darkMode : ""}
    ${className}
  `.trim();

    // Animation variants based on position and variant
    const getAnimationVariants = () => {
        if (variant === "inline") {
            return {
                initial: { opacity: 0, height: 0, marginBottom: 0 },
                animate: { opacity: 1, height: "auto", marginBottom: "1rem" },
                exit: { opacity: 0, height: 0, marginBottom: 0 },
            };
        }

        // Toast variant animations based on position
        const isLeft = position.includes("left");
        const isRight = position.includes("right");
        const isTop = position.includes("top");
        const isBottom = position.includes("bottom");

        return {
            initial: { 
                opacity: 0, 
                x: isLeft ? -100 : isRight ? 100 : 0,
                y: isTop ? -100 : isBottom ? 100 : 0 
            },
            animate: { opacity: 1, x: 0, y: 0 },
            exit: { 
                opacity: 0, 
                x: isLeft ? -100 : isRight ? 100 : 0,
                y: isTop ? -100 : isBottom ? 100 : 0 
            },
        };
    };

    const animationVariants = getAnimationVariants();

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className={containerClass}
                    initial={animationVariants.initial}
                    animate={animationVariants.animate}
                    exit={animationVariants.exit}
                    transition={{ duration: 0.3 }}
                >
                    {/* Floating icon at the top */}
                    <div className={styles.toastFloatingIcon}>
                        {icons[type]}
                    </div>
                    
                    {/* Main content wrapper */}
                    <div className={styles.toastInner}>
                        {/* Left side with decorative circles */}
                        <div className={styles.toastDecorative}>
                            <div className={styles.circle1}></div>
                            <div className={styles.circle2}></div>
                            <div className={styles.circle3}></div>
                        </div>
                        
                        {/* Content */}
                        <div className={styles.toastContentArea}>
                            <div className={styles.toastHeader}>
                                <h2 className={styles.toastTitle}>{title || getDefaultTitle()}</h2>
                            </div>
                            <p className={styles.toastMessage}>{message}</p>
                        </div>
                        
                        {/* Close button at top right corner */}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className={styles.toastClose}
                                type="button"
                                aria-label="Close"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
