import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Terminal, Lock, Network, Activity, Zap, ArrowRight, Cpu, Database, Globe } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="text-heading-lg font-semibold">D-Panel Ops</span>
          </div>
          <Link href="/login">
            <Button size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 md:h-20 md:w-20">
              <Shield className="h-8 w-8 text-primary md:h-10 md:w-10" />
            </div>
            <h1 className="text-heading-2xl md:text-heading-3xl font-bold tracking-tight mb-6">
              Red Team Operations Platform
            </h1>
            <p className="text-body-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Advanced command and control infrastructure for security testing, penetration testing, and red team operations. 
              Secure, scalable, and built for professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Access Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 py-16 bg-muted/30">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-heading-xl font-bold mb-4">Platform Capabilities</h2>
              <p className="text-body-md text-muted-foreground max-w-2xl mx-auto">
                Comprehensive toolkit for planning, executing, and managing security operations
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Network className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-heading-md">Infrastructure Management</CardTitle>
                  <CardDescription className="text-body-sm">
                    Deploy and manage distributed infrastructure with advanced networking capabilities
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Terminal className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-heading-md">Command & Control</CardTitle>
                  <CardDescription className="text-body-sm">
                    Secure C2 channels with encrypted communication and covert operations support
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-heading-md">Real-time Analytics</CardTitle>
                  <CardDescription className="text-body-sm">
                    Monitor operations with live dashboards and comprehensive reporting tools
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-heading-md">AI-Powered Automation</CardTitle>
                  <CardDescription className="text-body-sm">
                    Intelligent workflow automation with AI-assisted decision making and execution
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Cpu className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-heading-md">Payload Management</CardTitle>
                  <CardDescription className="text-body-sm">
                    Generate, customize, and deploy payloads across multiple platforms and architectures
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-heading-md">OSINT Integration</CardTitle>
                  <CardDescription className="text-body-sm">
                    Open-source intelligence gathering and analysis with automated data collection
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-heading-xl">Security & Compliance</CardTitle>
                <CardDescription className="text-body-md">
                  Built with security best practices and compliance in mind
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">End-to-End Encryption</h4>
                      <p className="text-body-sm text-muted-foreground">
                        All communications encrypted using industry-standard protocols
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Database className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">Audit Logging</h4>
                      <p className="text-body-sm text-muted-foreground">
                        Comprehensive activity logs for compliance and forensic analysis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">Access Control</h4>
                      <p className="text-body-sm text-muted-foreground">
                        Role-based permissions and multi-factor authentication support
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">OPSEC Features</h4>
                      <p className="text-body-sm text-muted-foreground">
                        Built-in operational security tools and best practice enforcement
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 bg-muted/30">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-heading-xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-body-md text-muted-foreground mb-8">
              Access the dashboard to manage your operations and infrastructure
            </p>
            <Link href="/login">
              <Button size="lg">
                Access Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-body-sm text-muted-foreground">
              © 2026 D-Panel Ops. Authorized personnel only.
            </p>
            <p className="text-body-sm text-muted-foreground">
              All access is logged and monitored for compliance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
