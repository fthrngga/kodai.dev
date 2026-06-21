import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';

// Premium Cyber Pulse Loading
const CyberPulse = () => (
    <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></div>
        <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest animate-pulse">Menghubungkan Syaraf AI...</span>
    </div>
);

export default function Show({ auth, project }) {
    const [chats, setChats] = useState(project.chats || []);
    const [inputPrompt, setInputPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isHosting, setIsHosting] = useState(false);
    const lastCompletedChat = (project.chats || []).slice().reverse().find(c => c.status === 'completed');
    const [livePreviewCode, setLivePreviewCode] = useState(lastCompletedChat ? lastCompletedChat.response : '');
    const [debouncedPreviewCode, setDebouncedPreviewCode] = useState('');
    const messagesEndRef = useRef(null);
    const iframeRef = useRef(null);

    const responseQueueRef = useRef('');

    const getCleanHtml = (raw) => {
        if (!raw) return '';
        
        // 1. Try to extract from Markdown block
        const match = raw.match(/```(?:html|javascript|css)?\n([\s\S]*?)(?:```|$)/i);
        if (match) return match[1];
        
        // 2. Fallback: try to find raw HTML tags if AI forgot backticks
        const htmlMatch = raw.match(/(<!DOCTYPE html>|<html[\s\S]*?<\/html>|<body[\s\S]*?<\/body>)/i);
        if (htmlMatch) return htmlMatch[1];
        
        // 3. Jika belum ada tanda-tanda HTML sama sekali (masih teks obrolan), kembalikan kosong
        if (!raw.includes('<div') && !raw.includes('<html')) {
            return '';
        }
        
        // 4. Last resort
        return raw.replace(/```(?:html)?/g, '');
    };

    const updateIframeContent = (newHtml) => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        
        try {
            const doc = iframe.contentDocument;
            if (!doc) return;

            const isReactSPA = newHtml.includes('text/babel');

            if (isReactSPA || !doc.body || doc.body.innerHTML.trim() === '') {
                // Injeksi Global Error Catcher agar pesan error AI tampil di layar, bukan cuma di Console
                const errorCatcher = `
                    <script>
                        window.onerror = function(msg, url, line, col, error) {
                            document.body.innerHTML = '<div style="color:#ff4444; background:#18181b; padding:2rem; font-family:monospace; height:100vh; overflow:auto;"><h2 style="font-weight:bold; margin-bottom:1rem; border-bottom:1px solid #3f3f46; padding-bottom:0.5rem;">🚨 Fatal Application Error</h2><p style="font-size:1.1rem; margin-bottom:1rem;">' + msg + '</p><p style="color:#a1a1aa; font-size:0.9rem; margin-bottom:0.5rem;">Location: Line ' + line + ', Column ' + col + '</p><pre style="background:#09090b; padding:1rem; border-radius:0.5rem; font-size:0.8rem; white-space:pre-wrap; border:1px solid #27272a;">' + (error && error.stack ? error.stack : 'No stack trace available') + '</pre><p style="margin-top:2rem; color:#a1a1aa; font-size:0.8rem;"><i>Silakan copy pesan error ini dan berikan ke AI sebagai instruksi revisi.</i></p></div>';
                            return false;
                        };
                        const origError = console.error;
                        console.error = function(...args) {
                            origError.apply(console, args);
                            const msg = args.map(a => typeof a === 'object' ? (a.message || JSON.stringify(a)) : a).join(' ');
                            if (msg.includes('SyntaxError') || msg.includes('ReferenceError') || msg.includes('Error:')) {
                                document.body.innerHTML = '<div style="color:#ff4444; background:#18181b; padding:2rem; font-family:monospace; height:100vh; overflow:auto;"><h2 style="font-weight:bold; margin-bottom:1rem; border-bottom:1px solid #3f3f46; padding-bottom:0.5rem;">🚨 Babel / React Compilation Error</h2><pre style="background:#09090b; padding:1rem; border-radius:0.5rem; font-size:0.8rem; white-space:pre-wrap; border:1px solid #27272a; margin-bottom:1rem;">' + msg + '</pre><p style="margin-top:1rem; color:#a1a1aa; font-size:0.8rem;"><i>Silakan copy pesan error ini dan berikan ke AI sebagai instruksi revisi.</i></p></div>';
                            }
                        };
                    </script>
                `;
                
                let finalHtml = newHtml;
                
                // Mencegah "Script error. Line 0" dengan memaksa CORS pada semua CDN
                finalHtml = finalHtml.replace(/<script src="([^"]+)"/g, (match, url) => {
                    if ((url.includes('unpkg.com') || url.includes('tailwindcss.com')) && !match.includes('crossorigin')) {
                        return `<script crossorigin="anonymous" src="${url}"`;
                    }
                    return match;
                });

                // MEMATIKAN data-type="module" AGAR BABEL TIDAK MENGGUNAKAN MODULE BROWSER
                finalHtml = finalHtml.replace(/<script\s+type="text\/babel"\s+data-type="module"/gi, '<script type="text/babel"');

                // Konfigurasi Preset Babel secara Programatis untuk memaksa CLASSIC RUNTIME
                const babelConfig = `
                    <script>
                        if (window.Babel && window.Babel.availablePresets) {
                            window.Babel.registerPreset('classic-react', {
                                presets: [ [window.Babel.availablePresets['react'], { "runtime": "classic" }] ]
                            });
                        }
                    </script>
                `;
                finalHtml = finalHtml.replace(/<script\s+type="text\/babel"[^>]*>/gi, babelConfig + '\\n<script type="text/babel" data-presets="env,classic-react">');

                if (finalHtml.includes('<head>')) {
                    finalHtml = finalHtml.replace('<head>', '<head>' + errorCatcher);
                } else {
                    finalHtml = errorCatcher + finalHtml;
                }

                // SPA React WAJIB dieksekusi dari awal. Menggunakan srcdoc lebih aman dari doc.write
                iframe.srcdoc = finalHtml;
                return;
            }

            // Smooth DOM Diffing untuk HTML statis agar tidak berkedip (flicker)
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(newHtml, 'text/html');

            const scrollX = iframe.contentWindow.scrollX;
            const scrollY = iframe.contentWindow.scrollY;

            if (newDoc.body) {
                Array.from(newDoc.body.attributes).forEach(attr => {
                    doc.body.setAttribute(attr.name, attr.value);
                });
                doc.body.innerHTML = newDoc.body.innerHTML;
            }

            iframe.contentWindow.scrollTo(scrollX, scrollY);
        } catch (e) {
            console.error("Iframe injection error:", e);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            const cleanHtml = getCleanHtml(livePreviewCode);
            setDebouncedPreviewCode(cleanHtml);
            
            // Deteksi cerdas: Apakah AI menyebut "React" di teks obrolan atau sedang menulis script Babel?
            const isReactSPA = livePreviewCode.toLowerCase().includes('react') || livePreviewCode.includes('text/babel');
            
            // JIKA ini adalah React SPA dan masih dalam proses generate, TUNDA RENDER IFRAME!
            if (isReactSPA && isGenerating) {
                return; 
            }

            // Gunakan setTimeout agar React sempat melakukan render dan iframeRef tidak null
            setTimeout(() => {
                if (cleanHtml) updateIframeContent(cleanHtml);
            }, 50);

        }, 800); 
        return () => clearTimeout(handler);
    }, [livePreviewCode, isGenerating]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chats]);

    useEffect(() => {
        const unprocessedChat = chats.find(c => c.status === 'processing' && !c.response);
        if (unprocessedChat) {
            handleStream(unprocessedChat.prompt, true);
        }
    }, []);

    const handleStream = async (promptText, isInitial = false) => {
        setIsGenerating(true);
        setLivePreviewCode('');
        responseQueueRef.current = '';
        
        let currentChats = [...chats];
        
        if (!isInitial) {
            currentChats.push({
                id: 'temp-' + Date.now(),
                prompt: promptText,
                response: '',
                status: 'processing'
            });
            setChats(currentChats);
            if (!isInitial) setInputPrompt('');
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await fetch(route('ai-builder.stream', project.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || ''
                },
                body: JSON.stringify({ prompt: promptText })
            });

            if (!response.body) throw new Error('ReadableStream not yet supported in this browser.');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let isStreamDone = false;
            
            const chatIndex = currentChats.length - 1;

            // Typewriter effect function
            const typeNext = () => {
                if (responseQueueRef.current.length > 0) {
                    // Take characters based on queue size to maintain smooth speed
                    const charsToTake = Math.max(1, Math.ceil(responseQueueRef.current.length / 20));
                    const chunk = responseQueueRef.current.slice(0, charsToTake);
                    responseQueueRef.current = responseQueueRef.current.slice(charsToTake);

                    setLivePreviewCode(prev => prev + chunk);
                    
                    setChats(prevChats => {
                        const newChats = [...prevChats];
                        if (newChats[chatIndex]) {
                             newChats[chatIndex].response = (newChats[chatIndex].response || '') + chunk;
                        }
                        return newChats;
                    });
                    
                    setTimeout(typeNext, 20); // 20ms typing speed
                } else {
                    if (isStreamDone) {
                        setChats(prevChats => {
                            const newChats = [...prevChats];
                            if (newChats[chatIndex]) {
                                 newChats[chatIndex].status = 'completed';
                            }
                            return newChats;
                        });
                        setIsGenerating(false);
                    } else {
                        setTimeout(typeNext, 50); // Wait for more data
                    }
                }
            };
            
            // Start the typewriter loop
            typeNext();

            while (!isStreamDone) {
                const { value, done } = await reader.read();
                isStreamDone = done;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    responseQueueRef.current += chunk;
                }
            }

        } catch (error) {
            console.error('Error during streaming:', error);
            setChats(prevChats => {
                const newChats = [...prevChats];
                const chatIndex = newChats.length - 1;
                if (newChats[chatIndex]) {
                     newChats[chatIndex].response = "Error connecting to AI Server.";
                     newChats[chatIndex].status = 'error';
                }
                return newChats;
            });
            setIsGenerating(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputPrompt.trim() || isGenerating) return;
        handleStream(inputPrompt);
    };

    const handleHostToKodaidev = () => {
        if (!confirm('Apakah Anda yakin ingin mendeploy hasil ini ke server Kodaidev sekarang?')) return;
        setIsHosting(true);
        router.post(route('ai-builder.host', project.id), {}, {
            onFinish: () => setIsHosting(false)
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-sm font-light tracking-[0.2em] uppercase text-white">Project: <span className="text-purple-400 font-bold">{project.name}</span></h2>}
        >
            <Head title={`Workspace - ${project.name}`} />

            <div className="py-6 h-[calc(100vh-100px)] relative z-10">
                <div className="max-w-[1600px] mx-auto sm:px-6 lg:px-8 h-full flex gap-6">
                    
                    {/* Chat Section */}
                    <div className="w-[380px] flex-shrink-0 bg-zinc-900/40 backdrop-blur-xl flex flex-col h-full border border-zinc-800 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                        
                        <div className="p-4 border-b border-zinc-800/50 bg-zinc-950/50 flex justify-between items-center z-10">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-300">Terminal AI</h3>
                            </div>
                            <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 uppercase tracking-wider font-bold">Gemini 2.5 Pro</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10 custom-scrollbar">
                            {chats.map((chat, idx) => (
                                <div key={chat.id || idx} className="space-y-4">
                                    {/* User Prompt */}
                                    <div className="flex justify-end">
                                        <div className="bg-cyan-900/30 border border-cyan-500/30 text-cyan-100 py-2.5 px-4 max-w-[85%] text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.1)] leading-relaxed relative">
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 opacity-50 blur-sm"></div>
                                            {chat.prompt}
                                        </div>
                                    </div>
                                    
                                    {/* AI Response */}
                                    {(chat.response || chat.status === 'processing') && (
                                        <div className="flex justify-start w-full">
                                            <div className={`py-3 px-4 max-w-full text-[11px] overflow-hidden break-words leading-relaxed border ${chat.status === 'error' ? 'bg-red-950/50 text-red-400 border-red-500/30' : 'bg-zinc-900 text-zinc-300 border-zinc-800 shadow-inner'}`}>
                                                {chat.status === 'error' && <div className="font-bold mb-1 text-red-500 uppercase tracking-widest text-[9px]">FATAL ERROR:</div>}
                                                {chat.response ? (
                                                    <pre className="whitespace-pre-wrap break-words font-mono">{chat.response}</pre>
                                                ) : (
                                                    <CyberPulse />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 z-10">
                            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                <textarea
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500/50 focus:ring-cyan-500/20 text-white text-xs font-mono p-3 h-20 resize-none transition-all"
                                    placeholder="Ketik instruksi revisi atau tambahan di sini..."
                                    value={inputPrompt}
                                    onChange={(e) => setInputPrompt(e.target.value)}
                                    disabled={isGenerating}
                                />
                                <button 
                                    disabled={isGenerating || !inputPrompt.trim()}
                                    type="submit"
                                    className="w-full py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500 font-mono text-[10px] uppercase tracking-widest font-bold transition-all disabled:opacity-50 active:scale-95"
                                >
                                    {isGenerating ? 'PROCESSING...' : 'TRANSMIT INSTRUCTION'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="flex-1 bg-zinc-950 flex flex-col h-full border border-zinc-800 shadow-2xl relative overflow-hidden">
                         <div className="p-3 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center text-white relative z-10">
                            <div className="flex gap-4 items-center">
                                <div className="flex gap-2 pl-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 border border-red-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 border border-yellow-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 border border-green-500/50"></div>
                                </div>
                                <div className="text-[10px] font-mono bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-400 tracking-wider flex items-center gap-2">
                                    <span>{debouncedPreviewCode || project.preview_url ? '127.0.0.1:3000' : 'Awaiting Connection...'}</span>
                                    {isGenerating && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => updateIframeContent(debouncedPreviewCode)} className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 transition-all">
                                    Refresh Engine
                                </button>
                                <button 
                                    onClick={handleHostToKodaidev}
                                    disabled={isHosting || isGenerating || !chats.some(c => c.status === 'completed')}
                                    className="text-[10px] uppercase tracking-widest text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-1.5 transition-all disabled:opacity-50 flex items-center gap-2 font-bold"
                                >
                                    {isHosting ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full border-t border-cyan-400 animate-spin"></span>
                                            DEPLOYING...
                                        </>
                                    ) : (
                                        '🚀 HOST TO KODAIDEV'
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Iframe Wrapper */}
                        <div className="flex-1 bg-zinc-950 flex items-center justify-center relative p-1">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                            
                            {/* OVERLAY LOADING UNTUK REACT SPA */}
                            {isGenerating && (livePreviewCode.toLowerCase().includes('react') || livePreviewCode.includes('text/babel')) && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm border border-cyan-500/30 m-1">
                                    <div className="w-16 h-16 border-t-2 border-b-2 border-cyan-400 rounded-full animate-spin mb-6"></div>
                                    <h3 className="text-cyan-400 font-mono font-bold tracking-widest uppercase">Kompilasi React SPA...</h3>
                                    <p className="text-zinc-400 text-xs font-mono mt-2 text-center max-w-sm">AI sedang membangun struktur komponen yang kompleks. Live Preview ditunda hingga kode utuh agar tidak merusak engine Babel.</p>
                                </div>
                            )}

                            {debouncedPreviewCode ? (
                                <iframe 
                                    ref={iframeRef}
                                    className="w-full h-full border border-zinc-800 bg-white relative z-10"
                                    title="Live Preview"
                                />
                            ) : project.preview_url ? (
                                <iframe 
                                    src={project.preview_url}
                                    className="w-full h-full border border-zinc-800 bg-white relative z-10"
                                    title="Live Preview"
                                />
                            ) : (
                                <div className="text-center flex flex-col items-center z-10 opacity-50">
                                    <div className="w-20 h-20 border border-dashed border-zinc-700 rounded-full flex items-center justify-center mb-6">
                                        <span className="w-2 h-2 bg-zinc-600 rounded-full animate-ping"></span>
                                    </div>
                                    <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.2em]">Live Render Standby</p>
                                    <p className="text-[10px] text-zinc-600 font-mono mt-2 uppercase">Awaiting incoming datastream...</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #27272a;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #3f3f46;
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
