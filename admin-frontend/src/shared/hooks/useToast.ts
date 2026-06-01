import { useState, useCallback } from "react";

export interface ToastState {
    message: string;
    type: "success" | "error" | "info" | "warning";
    visible: boolean;
    id?: string;
}

export interface UseToastReturn {
    toast: ToastState;
    showToast: (
        message: string,
        type?: "success" | "error" | "info" | "warning"
    ) => void;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showInfo: (message: string) => void;
    showWarning: (message: string) => void;
    hideToast: () => void;
    isVisible: boolean;
}

export const useToast = (
    initialState: Partial<ToastState> = {}
): UseToastReturn => {
    const [toast, setToast] = useState<ToastState>({
        message: "",
        type: "info",
        visible: false,
        ...initialState,
    });

    const showToast = useCallback(
        (
            message: string,
            type: "success" | "error" | "info" | "warning" = "info"
        ) => {
            setToast({
                message,
                type,
                visible: true,
                id: Date.now().toString(),
            });
        },
        []
    );

    const showSuccess = useCallback(
        (message: string) => {
            showToast(message, "success");
        },
        [showToast]
    );

    const showError = useCallback(
        (message: string) => {
            showToast(message, "error");
        },
        [showToast]
    );

    const showInfo = useCallback(
        (message: string) => {
            showToast(message, "info");
        },
        [showToast]
    );

    const showWarning = useCallback(
        (message: string) => {
            showToast(message, "warning");
        },
        [showToast]
    );

    const hideToast = useCallback(() => {
        setToast((prev) => ({ ...prev, visible: false }));
    }, []);

    return {
        toast,
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        hideToast,
        isVisible: toast.visible,
    };
};

// For multiple toasts (queue)
export interface UseToastQueueReturn extends UseToastReturn {
    toasts: ToastState[];
    removeToast: (id: string) => void;
    clearAllToasts: () => void;
}

export const useToastQueue = (): UseToastQueueReturn => {
    const [toasts, setToasts] = useState<ToastState[]>([]);

    const singleToast = useToast();

    const showToast = useCallback(
        (
            message: string,
            type: "success" | "error" | "info" | "warning" = "info"
        ) => {
            const id = Date.now().toString();
            const newToast: ToastState = {
                message,
                type,
                visible: true,
                id,
            };

            setToasts((prev) => [...prev, newToast]);

            // Also update single toast for compatibility
            singleToast.showToast(message, type);
        },
        [singleToast]
    );

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const clearAllToasts = useCallback(() => {
        setToasts([]);
        singleToast.hideToast();
    }, [singleToast]);

    const showSuccess = useCallback(
        (message: string) => {
            showToast(message, "success");
        },
        [showToast]
    );

    const showError = useCallback(
        (message: string) => {
            showToast(message, "error");
        },
        [showToast]
    );

    const showInfo = useCallback(
        (message: string) => {
            showToast(message, "info");
        },
        [showToast]
    );

    const showWarning = useCallback(
        (message: string) => {
            showToast(message, "warning");
        },
        [showToast]
    );

    return {
        toasts,
        toast: singleToast.toast,
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        hideToast: singleToast.hideToast,
        removeToast,
        clearAllToasts,
        isVisible: singleToast.isVisible,
    };
};

// Legacy aliases for backward compatibility
export const useNotification = useToast;
export type NotificationState = ToastState;
