"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
import { ADMIN_LOGIN } from "@/lib/graphql/queries";
import {
    ADMIN_TOKEN_KEY,
    ADMIN_USER_KEY,
    getStoredAdminUser,
    isAdminUser,
} from "@/lib/adminSession";
import {
    LockClosedIcon,
    UserIcon,
    EyeIcon,
    EyeSlashIcon,
} from "@heroicons/react/24/outline";
import ThemeToggle from "@/shared/components/common/ThemeToggle/ThemeToggle";
import { LoginSuccessModal } from "@/shared/components/common/modal/LoginSuccessModal";
import styles from "./admin-signin.module.css";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Login success modal state
    const [showLoginSuccess, setShowLoginSuccess] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState<{
        firstName: string;
        lastName: string;
        email: string;
    } | null>(null);

    const router = useRouter();
    const [adminLogin] = useMutation(ADMIN_LOGIN);

    useEffect(() => {
        const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
        const stored = getStoredAdminUser();
        if (token && stored && isAdminUser(stored)) {
            router.replace("/dashboard");
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { data } = await adminLogin({
                variables: { email, password },
            });

            if (
                data.adminLogin.success &&
                data.adminLogin.user?.userType?.toLowerCase() === "admin"
            ) {
                sessionStorage.setItem(ADMIN_TOKEN_KEY, data.adminLogin.token);
                sessionStorage.setItem(
                    ADMIN_USER_KEY,
                    JSON.stringify(data.adminLogin.user)
                );

                // Set user data and show success modal
                setLoggedInUser({
                    firstName: data.adminLogin.user.firstName || "Admin",
                    lastName: data.adminLogin.user.lastName || "",
                    email: data.adminLogin.user.email || email,
                });
                setShowLoginSuccess(true);
            } else {
                setError(data.adminLogin.message || "Login failed");
            }
        } catch (err) {
            setError("An error occurred during login");
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSuccessModalHide = () => {
        setShowLoginSuccess(false);
        router.push("/dashboard");
    };

    return (
        <div className={styles.pageContainer}>
            {/* Dark mode toggle in top right */}
            <div className={styles.darkModeToggle}>
                <ThemeToggle />
            </div>

            <div className={styles.formContainer}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.header}>
                        <div className={styles.logoContainer}>
                            <LockClosedIcon className={styles.logoIcon} />
                        </div>
                        <h2 className={styles.title}>Admin Dashboard</h2>
                        <p className={styles.subtitle}>
                            Teaching Tutor Administration
                        </p>
                    </div>

                    {error && (
                        <div className={`${styles.alert} ${styles.alertError}`}>
                            {error}
                        </div>
                    )}

                    <div className={styles.inputContainer}>
                        <div className={styles.inputWrapper}>
                            <UserIcon className={styles.inputIcon} />
                            <input
                                id="email"
                                name="email"
                                type="text"
                                required
                                className={styles.inputField}
                                placeholder="Username (admin)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.passwordContainer}>
                        <div className={styles.inputWrapper}>
                            <LockClosedIcon className={styles.inputIcon} />
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                className={styles.inputField}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={styles.passwordToggle}
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                {showPassword ? (
                                    <EyeSlashIcon
                                        className={styles.toggleIcon}
                                    />
                                ) : (
                                    <EyeIcon className={styles.toggleIcon} />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={styles.submitButton}
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>

                    <p className={styles.hintText}>
                        System administrator sign-in only. Use the account
                        configured in <code>ADMIN_EMAIL</code>.
                    </p>
                </form>
            </div>

            {/* Login Success Modal */}
            {showLoginSuccess && loggedInUser && (
                <LoginSuccessModal
                    user={loggedInUser}
                    isVisible={showLoginSuccess}
                    onHide={handleLoginSuccessModalHide}
                    duration={3000}
                />
            )}
        </div>
    );
}
