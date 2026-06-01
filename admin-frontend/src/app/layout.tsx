import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApolloWrapper } from "@/components/ApolloWrapper";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Teaching Tutor - Admin Dashboard",
    description: "Admin dashboard for Teaching Tutor application management",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body
                className={`${inter.className} flex flex-col min-h-screen`}
                suppressHydrationWarning
            >
                <ThemeProvider>
                    <ApolloWrapper>
                        <main className="flex-grow">{children}</main>
                    </ApolloWrapper>
                </ThemeProvider>
            </body>
        </html>
    );
}
