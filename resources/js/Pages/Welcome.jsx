import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge'
import { motion, useScroll, useTransform } from 'framer-motion';
import {
    Terminal, ArrowUpRight, ShieldCheck, Zap, Layers,
    Code2, Database, Layout, MessageSquare, ChevronRight, Cpu
} from 'lucide-react';

export default function Welcome({ auth }) {
    const { scrollY } = useScroll();
    const opacity = useTransform(scrollY, [0, 200], [1, 0]);

    return (
        <>
            <Head title="kodai dev" />

            <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden font-sans">
                {/* ADVANCED BACKGROUND OVERLAY */}
                <div className="fixed inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e293b_0%,transparent_50%)] opacity-40" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]" />
                </div>

                {/* NAVIGATION: FLOATING CENTER */}
                <div className="fixed top-8 left-0 right-0 z-50 flex justify-center w-full pointer-events-none px-4">
                    <nav className="flex items-center justify-between px-6 py-4 mx-auto w-full max-w-4xl bg-zinc-950/40 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] pointer-events-auto">
                        <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                <div className="relative flex items-center justify-center w-10 h-10 bg-black border border-zinc-800 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors">
                                        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                                        <line x1="12" y1="22" x2="12" y2="15.5" />
                                        <polyline points="22 8.5 12 15.5 2 8.5" />
                                        <polyline points="2 15.5 12 8.5 22 15.5" />
                                        <line x1="12" y1="2" x2="12" y2="8.5" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex flex-col leading-none pt-1">
                                <span className="text-xl font-light tracking-[0.2em] uppercase">kodai<span className="text-cyan-500 font-bold">.dev</span></span>
                            </div>
                        </div>

                        <div className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-medium">
                            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
                            <a href="#blueprint" className="hover:text-white transition-colors">Blueprint</a>
                            <a href="#contact" className="hover:text-white transition-colors">Consultation</a>
                            <div className="h-4 w-[1px] bg-zinc-800"></div>
                            {auth.user ? (
                                <Link href={route('dashboard')} className="text-cyan-400 hover:text-cyan-300 transition-colors">Terminal</Link>
                            ) : (
                                <Link href={route('login')} className="bg-white text-black px-4 py-2 rounded-full hover:bg-cyan-500 hover:text-white transition-all">Access</Link>
                            )}
                        </div>

                        {/* Mobile Action Button */}
                        <div className="flex md:hidden items-center text-[10px] uppercase tracking-[0.1em] font-bold">
                            {auth.user ? (
                                <Link href={route('dashboard')} className="text-cyan-400">Terminal</Link>
                            ) : (
                                <Link href={route('login')} className="bg-white text-black px-4 py-1.5 rounded-full">Access</Link>
                            )}
                        </div>
                    </nav>
                </div> 

                {/* HERO SECTION: THE "AAA" STATEMENT */}
                <section className="relative z-10 px-6 md:px-8 pt-32 md:pt-40 pb-20 md:pb-32 mx-auto max-w-7xl">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="max-w-5xl"
                    >
                        <span className="inline-block px-3 py-1 mb-8 text-[9px] md:text-[10px] font-medium tracking-[0.3em] md:tracking-[0.5em] uppercase border border-cyan-500/20 bg-cyan-500/5 text-cyan-400">
                            Architect As A Service
                        </span>

                        <h1 className="text-5xl sm:text-7xl md:text-9xl font-extralight tracking-[-0.04em] leading-[0.85] mb-10 mt-6">
                            ENGINEERING <br />
                            <span className="italic font-serif">Impeccable</span> <br />
                            <span className="font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-400 to-zinc-800">SOLUTIONS.</span>
                        </h1>

                        <p className="max-w-xl text-base md:text-lg text-zinc-500 leading-relaxed font-light tracking-wide mb-12">
                            Kami membangun infrastruktur digital yang tidak hanya berfungsi, tapi terstruktur. Spesialis dalam framework laravel dan react yang modern, cepat, dan aman.
                        </p>

                        <div className="flex flex-wrap gap-6">
                            <a href="https://wa.me/6289636925505?text=Halo%20Kodai%20Dev,%20saya%20tertarik%20untuk%20inisiasi%20projek" target="_blank" rel="noopener noreferrer">
                                <Button className="h-14 px-10 rounded-none bg-white text-black hover:bg-cyan-500 hover:text-white transition-all duration-500 group">
                                    <span className="text-xs uppercase tracking-[0.2em] font-bold">Inisiasi Projek</span>
                                    <ArrowUpRight className="ml-2 w-4 h-4 group-hover:rotate-45 transition-transform" />
                                </Button>
                            </a>
                            {/* <Button variant="outline" className="h-14 px-10 rounded-none border-zinc-800 bg-transparent hover:bg-zinc-900 transition-all duration-500 text-xs uppercase tracking-[0.2em]">
                                Technical Stack
                            </Button> */}
                        </div>
                    </motion.div>
                </section>

                {/* SOLUTIONS BENTO GRID: THE PROFESSIONAL PROOF */}
                <section id="solutions" className="relative z-10 px-6 md:px-8 py-20 md:py-32 mx-auto max-w-7xl border-t border-zinc-900">
                    <div className="mb-12 md:mb-16">
                        <span className="text-cyan-500 text-[9px] md:text-[10px] tracking-[0.3em] md:tracking-[0.5em] uppercase font-bold">01. Service Ecosystem</span>
                        <h2 className="text-4xl md:text-5xl font-extralight tracking-tight mt-4 uppercase">Advanced Solutions</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-auto md:auto-rows-[280px]">

                        {/* Major: Academic Excellence */}
                        <div className="md:col-span-8 md:row-span-2 relative overflow-hidden group border border-zinc-800 bg-zinc-900/10 backdrop-blur-xl p-8 md:p-12 min-h-[400px] md:min-h-0">
                            <Code2 className="absolute -right-10 -bottom-10 w-64 h-64 md:w-80 md:h-80 text-zinc-800/10 group-hover:text-cyan-500/10 transition-colors duration-700" />
                            <div className="relative h-full flex flex-col justify-end">
                                <Badge className="w-fit mb-4 md:mb-6 rounded-none bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[9px] tracking-widest uppercase">Skripsi & Final Projects</Badge>
                                <h3 className="text-3xl md:text-4xl font-light tracking-tight mb-4 md:mb-6 uppercase">Academic Excellence</h3>
                                <p className="max-w-md text-zinc-500 text-sm leading-relaxed mb-6 md:mb-8">
                                    Pengerjaan Tugas Akhir IT dengan standar dokumentasi tinggi. Kami menyusun ERD, Class Diagram, dan Flowchart agar Anda siap menghadapi penguji dengan percaya diri.
                                </p>
                                <div className="flex flex-wrap gap-2 md:gap-4 text-[9px] md:text-[10px] font-mono text-zinc-600">
                                    <span>[ CLEAN_CODE ]</span>
                                    <span>[ FULL_DOCS ]</span>
                                    <span>[ SUPPORT_SESSIONS ]</span>
                                </div>
                            </div>
                        </div>

                        {/* Tech Proof: Enterprise Backend */}
                        <div className="md:col-span-4 md:row-span-1 border border-zinc-800 bg-zinc-950 p-6 md:p-8 flex flex-col justify-between group hover:border-cyan-500/50 transition-all min-h-[200px] md:min-h-0">
                            <Database className="w-8 h-8 text-zinc-600 group-hover:text-cyan-400 mb-6 md:mb-0" />
                            <div>
                                <h3 className="text-xs uppercase tracking-[0.2em] mb-2 md:mb-3 font-bold">Enterprise Backend</h3>
                                <p className="text-zinc-600 text-[11px] leading-relaxed italic font-serif">Tulang punggung bisnis yang cepat, aman, dan scalable.</p>
                            </div>
                        </div>

                        {/* Tech Proof: Custom Web Apps */}
                        <div className="md:col-span-4 md:row-span-1 border border-zinc-800 bg-zinc-950 p-6 md:p-8 flex flex-col justify-between group hover:border-purple-500/50 transition-all min-h-[200px] md:min-h-0">
                            <Layout className="w-8 h-8 text-zinc-600 group-hover:text-purple-400 mb-6 md:mb-0" />
                            <div>
                                <h3 className="text-xs uppercase tracking-[0.2em] mb-2 md:mb-3 font-bold">Custom Web Apps</h3>
                                <p className="text-zinc-600 text-[11px] leading-relaxed italic font-serif">SaaS, Dashboard, & E-commerce dengan estetika premium.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* THE BLUEPRINT: VERTICAL EXECUTION */}
                <section id="blueprint" className="relative z-10 px-6 md:px-8 py-20 md:py-32 mx-auto max-w-7xl border-t border-zinc-900 bg-[#070707]">
                    <div className="grid md:grid-cols-2 gap-12 md:gap-20">
                        <div>
                            <span className="text-purple-500 text-[9px] md:text-[10px] tracking-[0.3em] md:tracking-[0.5em] uppercase font-bold">02. Execution Blueprint</span>
                            <h2 className="text-5xl md:text-6xl font-extralight tracking-tighter mt-4 uppercase leading-none">The <br className="hidden md:block"/> Process</h2>
                            <p className="mt-10 text-zinc-500 max-w-sm leading-relaxed font-light">
                                Setiap projek ditangani dengan metodologi arsitektur yang ketat untuk memastikan hasil akhir yang presisi.
                            </p>
                        </div>
                        <div className="space-y-16">
                            <ProcessItem
                                num="01"
                                title="Consultation"
                                desc="Diskusi mendalam untuk membedah masalah teknis Anda secara gratis."
                            />
                            <ProcessItem
                                num="02"
                                title="Architecting"
                                desc="Penyusunan blueprint sistem (ERD, Diagram) sebelum baris kode pertama ditulis."
                            />
                            <ProcessItem
                                num="03"
                                title="Development"
                                desc="Proses koding intensif dengan update progress berkala lewat dashboard."
                            />
                            <ProcessItem
                                num="04"
                                title="Handover"
                                desc="Penyerahan source code lengkap beserta sesi penjelasan teknis sistem."
                            />
                        </div>
                    </div>
                </section>

                {/* CTA SECTION: THE CONSULTATION */}
                <section id="contact" className="relative z-10 px-4 md:px-8 py-20 md:py-40 mx-auto max-w-7xl">
                    <div className="border border-zinc-800 bg-zinc-900/10 p-8 py-16 md:p-20 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

                        <h2 className="text-4xl md:text-7xl font-extralight tracking-tighter uppercase mb-6 md:mb-10">
                            Build Your <br className="hidden md:block" /> <span className="italic font-serif">Masterpiece</span> Today.
                        </h2>

                        <p className="text-zinc-500 max-w-lg mx-auto mb-10 md:mb-12 font-light tracking-wide text-xs md:text-sm px-4">
                            Jangan biarkan kompleksitas menghambat langkah Anda. Mari berdiskusi tentang visi teknis Anda sekarang.
                        </p>

                        <div className="flex justify-center gap-6">
                            <a href="https://wa.me/6289636925505?text=Halo%20Kodai%20Dev,%20saya%20ingin%20konsultasi%20mengenai" target="_blank" rel="noopener noreferrer">
                                <Button className="h-14 md:h-16 px-8 md:px-12 rounded-none bg-white text-black font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] text-[10px] hover:bg-cyan-500 hover:text-white transition-all whitespace-nowrap">
                                    Mulai Konsultasi
                                </Button>
                            </a>
                        </div>
                    </div>
                </section>

                <footer className="relative z-10 px-6 md:px-8 py-10 border-t border-zinc-900 text-center flex flex-col items-center justify-center">
                    <span className="text-[8px] md:text-[10px] text-zinc-700 tracking-[0.3em] md:tracking-[0.8em] uppercase max-w-xs md:max-w-none">
                        © 2026 KODAI.DEV — Systems Engineering Studio
                    </span>
                </footer>
            </div>
        </>
    );
}
function ProcessItem({ num, title, desc }) {
    return (
        <div className="group border-b border-zinc-900 pb-8 md:pb-10">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8">
                <span className="text-zinc-800 font-mono text-3xl md:text-4xl font-bold group-hover:text-cyan-500 transition-colors">{num}</span>
                <div>
                    <h4 className="text-lg md:text-xl uppercase tracking-[0.1em] md:tracking-[0.2em] font-light mb-2 md:mb-3">{title}</h4>
                    <p className="text-zinc-500 text-xs md:text-sm leading-relaxed max-w-md">{desc}</p>
                </div>
            </div>
        </div>
    );
}