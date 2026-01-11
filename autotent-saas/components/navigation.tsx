"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navigation() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                            <span className="text-white font-bold text-xl">A</span>
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            AutoTent
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="#features" className="text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors">
                            Features
                        </Link>
                        <Link href="#how-it-works" className="text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors">
                            How It Works
                        </Link>
                        <Link href="#pricing" className="text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors">
                            Pricing
                        </Link>
                    </div>

                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Link
                            href="/login"
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors"
                        >
                            Login
                        </Link>
                        <Link
                            href="/login"
                            className="px-6 py-2 rounded-full gradient-primary text-white font-medium hover:shadow-lg hover:scale-105 transition-all"
                        >
                            Get Started
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {isMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex flex-col space-y-4">
                            <Link href="#features" className="text-gray-700 dark:text-gray-300 hover:text-purple-600">
                                Features
                            </Link>
                            <Link href="#how-it-works" className="text-gray-700 dark:text-gray-300 hover:text-purple-600">
                                How It Works
                            </Link>
                            <Link href="#pricing" className="text-gray-700 dark:text-gray-300 hover:text-purple-600">
                                Pricing
                            </Link>
                            <Link href="/login" className="text-gray-700 dark:text-gray-300 hover:text-purple-600">
                                Login
                            </Link>
                            <Link
                                href="/login"
                                className="px-6 py-2 rounded-full gradient-primary text-white font-medium text-center"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
