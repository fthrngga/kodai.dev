import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

export default function Show({ auth, project }) {
    const [chats, setChats] = useState(project.chats || []);
    const [inputPrompt, setInputPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [livePreviewCode, setLivePreviewCode] = useState('');
    const [debouncedPreviewCode, setDebouncedPreviewCode] = useState('');
    const messagesEndRef = useRef(null);

    const getCleanHtml = (raw) => {
        if (!raw) return '';
        const match = raw.match(/```(?:html|javascript|css)?\n([\s\S]*?)(?:```|$)/);
        if (match) return match[1];
        return raw.replace(/```(?:html)?/g, '');
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedPreviewCode(getCleanHtml(livePreviewCode));
        }, 300);
        return () => clearTimeout(handler);
    }, [livePreviewCode]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chats]);

    // Handle the initial generation if it's a new project with an unprocessed prompt
    useEffect(() => {
        const unprocessedChat = chats.find(c => c.status === 'processing' && !c.response);
        if (unprocessedChat) {
            handleStream(unprocessedChat.prompt, true);
        }
    }, []);

    const handleStream = async (promptText, isInitial = false) => {
        setIsGenerating(true);
        setLivePreviewCode('');
        
        let currentChats = [...chats];
        
        // If it's not the initial load, add the new prompt to UI immediately
        if (!isInitial) {
            currentChats.push({
                id: 'temp-' + Date.now(),
                prompt: promptText,
                response: '',
                status: 'processing'
            });
            setChats(currentChats);
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
            let isDone = false;
            
            // Temporary index of the currently generating chat
            const chatIndex = currentChats.length - 1;

            while (!isDone) {
                const { value, done } = await reader.read();
                isDone = done;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    
                    setLivePreviewCode(prev => prev + chunk);
                    
                    // Update state to append the new chunk
                    setChats(prevChats => {
                        const newChats = [...prevChats];
                        if (newChats[chatIndex]) {
                             newChats[chatIndex].response = (newChats[chatIndex].response || '') + chunk;
                        }
                        return newChats;
                    });
                }
            }

            // Mark as completed
            setChats(prevChats => {
                const newChats = [...prevChats];
                if (newChats[chatIndex]) {
                     newChats[chatIndex].status = 'completed';
                }
                return newChats;
            });

        } catch (error) {
            console.error('Error during streaming:', error);
            // Handle error in UI
            setChats(prevChats => {
                const newChats = [...prevChats];
                const chatIndex = newChats.length - 1;
                if (newChats[chatIndex]) {
                     newChats[chatIndex].response = "Error connecting to AI Server.";
                     newChats[chatIndex].status = 'error';
                }
                return newChats;
            });
        } finally {
            setIsGenerating(false);
            if (!isInitial) {
                setInputPrompt('');
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputPrompt.trim() || isGenerating) return;
        
        handleStream(inputPrompt);
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Project: {project.name}</h2>}
        >
            <Head title={project.name} />

            <div className="py-6 h-[calc(100vh-100px)]">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 h-full flex gap-6">
                    
                    {/* Chat Section */}
                    <div className="w-1/3 bg-white shadow sm:rounded-lg flex flex-col h-full border border-gray-200">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
                            <h3 className="font-medium text-gray-800">AI Assistant</h3>
                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">Gemini 2.5 Pro</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chats.map((chat, idx) => (
                                <div key={chat.id || idx} className="space-y-4">
                                    {/* User Prompt */}
                                    <div className="flex justify-end">
                                        <div className="bg-indigo-600 text-white rounded-lg rounded-tr-none py-2 px-4 max-w-[85%] text-sm">
                                            {chat.prompt}
                                        </div>
                                    </div>
                                    
                                    {/* AI Response */}
                                    {(chat.response || chat.status === 'processing') && (
                                        <div className="flex justify-start">
                                            <div className="bg-gray-100 text-gray-800 rounded-lg rounded-tl-none py-3 px-4 max-w-[90%] text-sm overflow-x-auto">
                                                {chat.response ? (
                                                    <pre className="whitespace-pre-wrap font-sans">{chat.response}</pre>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                                        <span className="ml-2 text-xs">Generating...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <TextInput
                                    type="text"
                                    className="flex-1 block w-full"
                                    placeholder="Type your revision or instructions..."
                                    value={inputPrompt}
                                    onChange={(e) => setInputPrompt(e.target.value)}
                                    disabled={isGenerating}
                                />
                                <PrimaryButton disabled={isGenerating || !inputPrompt.trim()}>
                                    Send
                                </PrimaryButton>
                            </form>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="w-2/3 bg-white shadow sm:rounded-lg flex flex-col h-full border border-gray-200 overflow-hidden">
                         <div className="p-3 border-b border-gray-200 bg-gray-800 flex justify-between items-center text-white">
                            <div className="flex gap-2 items-center">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span className="ml-4 text-xs font-mono bg-gray-700 px-2 py-1 rounded text-gray-300">
                                    {project.preview_url ? project.preview_url : 'Live Preview (Waiting for Generation)'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition">Refresh</button>
                                <button className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition shadow">
                                    Host to Kodaidev
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-50 flex items-center justify-center relative">
                            {debouncedPreviewCode || project.preview_url ? (
                                <iframe 
                                    {...(debouncedPreviewCode ? { srcDoc: debouncedPreviewCode } : { src: project.preview_url })}
                                    className="w-full h-full border-none bg-white"
                                    title="Live Preview"
                                />
                            ) : (
                                <div className="text-center text-gray-500 flex flex-col items-center">
                                    <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <p>Live preview will appear here</p>
                                    <p className="text-sm mt-2">Waiting for AI to generate code...</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
