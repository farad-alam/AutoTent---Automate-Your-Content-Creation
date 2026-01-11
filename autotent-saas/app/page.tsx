import Navigation from "@/components/navigation";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Navigation />

      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: "2s" }}></div>
            <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: "4s" }}></div>
          </div>

          <div className="container mx-auto max-w-6xl">
            <div className="text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  ✨ AI-Powered Content Automation
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
                  Automate Your Content
                </span>
                <br />
                <span className="text-gray-900 dark:text-white">
                  Creation with AI
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Generate high-quality blog posts and articles automatically using Google Gemini AI.
                Seamlessly publish to your Sanity CMS with zero manual effort.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Link
                  href="/login"
                  className="px-8 py-4 rounded-full gradient-primary text-white font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all"
                >
                  Start Creating Content
                </Link>
                <Link
                  href="#how-it-works"
                  className="px-8 py-4 rounded-full border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-lg hover:border-purple-500 hover:text-purple-600 transition-all"
                >
                  See How It Works
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    10x
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Faster Creation</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                    100%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Automated</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent">
                    24/7
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Always On</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Powerful Features
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Everything you need to automate your content workflow
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-bold mb-3">AI-Powered Generation</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Leverage Google Gemini AI to create engaging, SEO-optimized content automatically
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl gradient-info flex items-center justify-center mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Sanity CMS Integration</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Seamlessly publish content directly to your Sanity.io projects with one click
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Background Processing</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Queue-based job processing with Inngest ensures reliable content generation
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl gradient-warning flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Job Management</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Track all your content generation jobs with detailed status and results
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl gradient-danger flex items-center justify-center mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Secure & Private</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Enterprise-grade security with Supabase authentication and encrypted credentials
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Built on Next.js 14 and optimized for maximum performance and speed
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  How It Works
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Start generating content in 3 simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-6">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Connect Your Sanity Project</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Link your Sanity.io project with your API credentials in seconds
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl gradient-info flex items-center justify-center mb-6">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Enter Your Keywords</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Provide topics or keywords for the content you want to generate
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl gradient-success flex items-center justify-center mb-6">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Let AI Do the Work</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Sit back and watch as AI generates and publishes your content automatically
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="pricing" className="py-20 px-4 bg-gradient-to-r from-purple-600 to-blue-600">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Automate Your Content?
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              Start generating high-quality content today. No credit card required.
            </p>
            <Link
              href="/login"
              className="inline-block px-8 py-4 rounded-full bg-white text-purple-600 font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
            >
              Get Started for Free
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                    <span className="text-white font-bold text-xl">A</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    AutoTent
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Automate your content creation with AI-powered tools.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><Link href="#features" className="hover:text-purple-600">Features</Link></li>
                  <li><Link href="#how-it-works" className="hover:text-purple-600">How It Works</Link></li>
                  <li><Link href="#pricing" className="hover:text-purple-600">Pricing</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><Link href="#" className="hover:text-purple-600">About</Link></li>
                  <li><Link href="#" className="hover:text-purple-600">Blog</Link></li>
                  <li><Link href="#" className="hover:text-purple-600">Contact</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li><Link href="#" className="hover:text-purple-600">Privacy</Link></li>
                  <li><Link href="#" className="hover:text-purple-600">Terms</Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-8 text-center text-sm text-gray-600 dark:text-gray-400">
              <p>© 2026 AutoTent. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
