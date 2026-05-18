import { useState, useEffect } from 'react';

// ByrdHouse Logo SVG (bird + house silhouette, white on transparent)
const BYRDHOUSE_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='100%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%235B2D8E'/%3E%3Cstop offset='100%25' stop-color='%23E91E8C'/%3E%3C/defs%3E%3Cpath fill='url(%23g)' d='M256 32L480 192V448H352V320H160V448H32V192Z'/%3E%3Cpath fill='white' d='M256 32L480 192V448H352V320H160V448H32V192ZM256 96L160 160V200L240 160L160 120V160L256 96ZM256 96L352 160V120L256 160Z'/%3E%3C/svg%3E";

interface User {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  clicks: number;
  referrals: number;
  joinedAt: number;
  stripeCustomerId?: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tier: 'free' | 'pro' | 'enterprise';
  disabled?: boolean;
  maintenanceNote?: string;
  clicks: number;
  revenue: number;
}

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  yearlyPrice: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  features: string[];
  tier: 'free' | 'pro' | 'enterprise';
}
const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  { id: 'free', name: 'Free', price: 0, yearlyPrice: 0, tier: 'free', stripePriceIdMonthly: '', stripePriceIdYearly: '', features: ['5 Tools', 'AI Chat', '50 Credits/month', 'Community Support'] },
  { id: 'pro', name: 'Pro', price: 9.99, yearlyPrice: 95.88, tier: 'pro', stripePriceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || '', stripePriceIdYearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || '', features: ['All 15 AI Tools', 'Unlimited Credits', 'Priority Processing', '10% Revenue Share', 'Email Support'] },
  { id: 'enterprise', name: 'Enterprise', price: 29.99, yearlyPrice: 287.88, tier: 'enterprise', stripePriceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY || '', stripePriceIdYearly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_YEARLY || '', features: ['Everything Pro', 'Team Access (5)', 'API Access', '25% Revenue Share', 'Dedicated Manager'] }
];

const TOOLS: Tool[] = [
  { id: 'chat', name: 'AI Chat', description: 'Chat with AI - Write, Code, Analyze', category: 'ai', icon: '💬', tier: 'free', clicks: 0, revenue: 0.01 },
  { id: 'image', name: 'Image Gen', description: 'Generate AI images from text', category: 'ai', icon: '🎨', tier: 'free', clicks: 0, revenue: 0.05 },
  { id: 'video', name: 'Video Gen', description: 'Create AI videos from images', category: 'ai', icon: '🎬', tier: 'pro', clicks: 0, revenue: 0.10 },
  { id: 'music', name: 'Music Gen', description: 'Generate AI music from text', category: 'ai', icon: '🎵', tier: 'pro', clicks: 0, revenue: 0.08 },
  { id: 'audio', name: 'Text to Speech', description: 'Convert text to natural speech', category: 'ai', icon: '🎙️', tier: 'free', clicks: 0, revenue: 0.03 },
  { id: 'writer', name: 'AI Writer', description: 'Write articles, emails, posts', category: 'ai', icon: '✍️', tier: 'free', clicks: 0, revenue: 0.02 },
  { id: 'code', name: 'Code AI', description: 'Generate and debug code', category: 'ai', icon: '💻', tier: 'free', clicks: 0, revenue: 0.02 },
  { id: 'translate', name: 'Translator', description: 'Translate between 100+ languages', category: 'ai', icon: '🌐', tier: 'free', clicks: 0, revenue: 0.02 },
  { id: 'thumbnail', name: 'Thumbnail Gen', description: 'Create YouTube thumbnails', category: 'ai', icon: '🖼️', tier: 'pro', clicks: 0, revenue: 0.05 },
  { id: 'pdf', name: 'PDF Creator', description: 'Generate professional PDFs', category: 'ai', icon: '📄', tier: 'free', clicks: 0, revenue: 0.03 },
  { id: 'slides', name: 'Presentation', description: 'Create stunning slide decks', category: 'ai', icon: '📊', tier: 'free', clicks: 0, revenue: 0.03 },
  { id: 'bgremove', name: 'BG Remover', description: 'Remove image backgrounds instantly', category: 'ai', icon: '🪄', tier: 'pro', clicks: 0, revenue: 0.05 },
  { id: 'logo', name: 'Logo Maker', description: 'Design professional logos', category: 'ai', icon: '🏷️', tier: 'pro', clicks: 0, revenue: 0.05 },
  { id: 'imageedit', name: 'Image Edit', description: 'Edit and enhance images', category: 'ai', icon: '🎯', tier: 'pro', clicks: 0, revenue: 0.05 },
  { id: 'voiceover', name: 'Voice Cloning', description: 'Clone voices for narration', category: 'ai', icon: '🎭', tier: 'enterprise', clicks: 0, revenue: 0.10 },
];

// =============================================================================
// MiniMax API Service — via backend proxy (no key exposed to client)
// =============================================================================

// Route all AI calls through the Express backend so the API key stays server-side.
// If the backend is unavailable or returns an error, fall back to direct MiniMax calls
// (which require MINIMAX_API_KEY to be set in App.tsx for development only).
async function byrdhouseFetch<T = unknown>(endpoint: string, body: Record<string, unknown>, fallback?: () => Promise<T>): Promise<T> {
  try {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Backend error ${res.status}`);
    return data as T;
  } catch {
    if (fallback) return fallback();
    throw new Error(`Backend unavailable. Start the backend server: cd backend && npm start`);
  }
}

async function minimaxChat(message: string, history: {role:string;content:string}[] = []): Promise<string> {
  const data = await byrdhouseFetch<{response: string}>('/chat', { message, history });
  return data.response;
}

async function minimaxTranslate(text: string, to: string): Promise<string> {
  const data = await byrdhouseFetch<{translation: string}>('/translate', { text, to });
  return data.translation.trim();
}

async function minimaxCode(language: string, prompt: string): Promise<string> {
  const data = await byrdhouseFetch<{code: string}>('/code', { language, prompt });
  let code = data.code || '';
  return code.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
}

async function minimaxWrite(type: string, prompt: string): Promise<string> {
  const data = await byrdhouseFetch<{content: string}>('/write', { type, prompt });
  return data.content || '';
}

// MiniMax image generation (uses image_synthesize MCP tool instead of REST to get cleaner results)
async function minimaxImage(prompt: string, width = 1024, height = 1024): Promise<string> {
  // Use MCP image tool directly from browser — cleaner output
  if (typeof window !== 'undefined' && (window as any).generateByrdhouseImage) {
    return (window as any).generateByrdhouseImage(prompt);
  }
  // Fallback: use direct Pollinations URL (no logo with nologo=true)
  const seed = Math.floor(Math.random() * 999999);
  const safePrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

async function minimaxTTS(text: string, voice_id = 'male-qn-qingse', speed = 1.0): Promise<{ audioUrl: string|null; status: string }> {
  try {
    const data = await byrdhouseFetch<{audioUrl?: string; data?: {audio_file?: string}; status?: string}>('/tts', { text, voice_id, speed });
    return { audioUrl: data.audioUrl || data.data?.audio_file || null, status: data.status || 'success' };
  } catch {
    // Fallback to browser TTS
    if (typeof window !== 'undefined') {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed;
      speechSynthesis.speak(utterance);
    }
    return { audioUrl: null, status: 'browser-tts' };
  }
}

async function byrdhouseImage(prompt: string, width = 1024, height = 1024): Promise<string> {
  const data = await byrdhouseFetch<{imageUrl: string}>('/image-generate', { prompt, width, height });
  return data.imageUrl;
}

async function byrdhouseVideo(prompt: string, imageUrl?: string, duration = 6, resolution = '768P'): Promise<{ videoUrl?: string; imageUrl?: string; status: string; message?: string; jobId?: string }> {
  return byrdhouseFetch('/video-generate', { prompt, imageUrl, duration, resolution });
}

async function byrdhouseMusic(prompt: string, lyrics?: string): Promise<{ audioUrl?: string; status: string; message?: string; jobId?: string }> {
  return byrdhouseFetch('/music-generate', { prompt, lyrics });
}

async function byrdhouseThumbnail(prompt: string): Promise<string> {
  const data = await byrdhouseFetch<{imageUrl: string}>('/thumbnail-generate', { prompt });
  return data.imageUrl;
}

async function byrdhouseLogo(prompt: string): Promise<string> {
  const data = await byrdhouseFetch<{imageUrl: string}>('/logo-generate', { prompt });
  return data.imageUrl;
}

async function byrdhouseBGRemove(imageData: File | string): Promise<{ imageUrl: string; status: string }> {
  // Accept File object (client upload) or URL string
  if (typeof imageData === 'object' && imageData !== null) {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageData);
    });
    return byrdhouseFetch('/bg-remove', { imageData: base64, isBase64: true });
  }
  return byrdhouseFetch('/bg-remove', { imageUrl: imageData });
}

// =============================================================================
// PDF GENERATION (client-side using jsPDF CDN)
// =============================================================================

async function generateClientPDF(title: string, content: string): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(91, 45, 142);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'ByrdHouse Document', 20, 25);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated by ByrdHouse • ${new Date().toLocaleDateString()}`, 20, 290);
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const lines = content.split('\n');
  let y = 55;
  const margin = 20;
  const lineHeight = 7;
  for (const line of lines) {
    if (y > 280) { doc.addPage(); y = 20; }
    const wrapped = doc.splitTextToSize(line, 210 - 2 * margin);
    for (const l of wrapped) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(l, margin, y);
      y += lineHeight;
    }
  }
  return doc.output('datauristring');
}

// =============================================================================
// PPTX GENERATION (client-side)
// =============================================================================

async function generateClientPPTX(topic: string): Promise<void> {
  const PptxGenJS = (window as any).PptxGenJS;
  if (!PptxGenJS) throw new Error('PPTX library not loaded');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = topic;
  pptx.author = 'ByrdHouse';
  const primary = '5B2D8E', accent = 'E91E8C', dark = '0D0D0D', light = 'FFFFFF';

  // Slide 1 - Title
  const s1 = pptx.addSlide();
  s1.background = { color: dark };
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: primary, transparency: 30 } });
  s1.addShape(pptx.ShapeType.rect, { x: 6, y: 3, w: 4, h: 2.625, fill: { color: accent, transparency: 40 } });
  s1.addText(topic, { x: 0.5, y: 1.5, w: 9, h: 1.5, fontSize: 44, bold: true, color: light, fontFace: 'Arial', align: 'center' });
  s1.addText('Created with ByrdHouse AI', { x: 0.5, y: 3.2, w: 9, h: 0.6, fontSize: 18, color: 'CCCCCC', align: 'center' });

  // Slide 2 - Overview
  const s2 = pptx.addSlide();
  s2.background = { color: dark };
  s2.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.2, h: 5.625, fill: { color: primary } });
  s2.addText('Overview', { x: 0.5, y: 0.4, w: 9, h: 0.8, fontSize: 32, bold: true, color: light, fontFace: 'Arial' });
  s2.addText([
    { text: 'What is it?\n', options: { bold: true, color: accent, fontSize: 16 } },
    { text: `${topic} is an important concept with many applications.\n\n`, options: { color: 'CCCCCC', fontSize: 14 } },
    { text: 'Why does it matter?\n', options: { bold: true, color: accent, fontSize: 16 } },
    { text: `Understanding ${topic} can help you make better decisions and achieve your goals.`, options: { color: 'CCCCCC', fontSize: 14 } }
  ], { x: 0.7, y: 1.5, w: 8.5, h: 3.5, valign: 'top' });

  // Slide 3 - Key Points
  const s3 = pptx.addSlide();
  s3.background = { color: dark };
  s3.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.2, h: 5.625, fill: { color: primary } });
  s3.addText('Key Points', { x: 0.5, y: 0.4, w: 9, h: 0.8, fontSize: 32, bold: true, color: light, fontFace: 'Arial' });
  const points = ['Foundation: Core concepts and principles', 'Application: Real-world use cases', 'Benefits: What you gain', 'Next Steps: How to get started'];
  points.forEach((pt, i) => {
    s3.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.3 + i * 0.9, w: 8.5, h: 0.7, fill: { color: '1E1E1E' }, line: { color: primary, width: 1 } });
    s3.addText(`${i + 1}.  ${pt}`, { x: 0.9, y: 1.4 + i * 0.9, w: 8, h: 0.5, fontSize: 14, color: light, fontFace: 'Arial', valign: 'middle' });
  });

  // Slide 4 - Conclusion
  const s4 = pptx.addSlide();
  s4.background = { color: primary };
  s4.addText('Conclusion', { x: 0.5, y: 1.5, w: 9, h: 0.8, fontSize: 36, bold: true, color: light, align: 'center' });
  s4.addText(`"${topic}" — Start creating today with ByrdHouse.`, { x: 0.5, y: 2.5, w: 9, h: 1, fontSize: 20, color: 'DDDDDD', align: 'center', italic: true });
  s4.addText('byrdhouse.ai', { x: 0.5, y: 4.5, w: 9, h: 0.5, fontSize: 14, color: 'CCCCCC', align: 'center' });

  const blob = await pptx.write('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${topic}.pptx`;
  a.click();
  URL.revokeObjectURL(url);
}

// =============================================================================
// UTILS
// =============================================================================

const getStorage = (key: string, defaultValue: unknown): unknown => {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : defaultValue; } catch { return defaultValue; }
};
const setStorage = (key: string, value: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

// =============================================================================
// TOOL COMPONENTS
// =============================================================================

function AIChatTool({ trackTool }: { trackTool: (id: string) => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai'; content: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    trackTool('chat');
    setLoading(true);
    setError('');
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await minimaxChat(input, history);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error. Please check your MiniMax API key.';
      setError(msg);
      setMessages(prev => [...prev, { role: 'ai', content: `⚠️ ${msg}` }]);
    }
    setInput('');
    setLoading(false);
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">💬 AI Chat</h3><span className="text-xs text-green-400">✓ Free</span></div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.length === 0 && <div className="text-center text-gray-500 py-8"><p className="text-2xl mb-2">💬</p><p>Ask me anything!</p><p className="text-xs mt-2 text-gray-600">Powered by MiniMax AI</p></div>}
        {messages.map((msg, i) => <div key={i} className={`p-3 rounded-xl ${msg.role === 'user' ? 'bg-purple-500/20 ml-8' : 'bg-gray-800 mr-8'}`}><p className="text-sm whitespace-pre-wrap">{msg.content}</p></div>)}
        {loading && <div className="p-3 bg-gray-800 rounded-xl"><p className="text-sm animate-pulse">🤖 Thinking... (MiniMax AI)</p></div>}
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything..." className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none" />
        <button type="submit" disabled={loading || !input} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}

function ImageGenTool({ trackTool }: { trackTool: (id: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setImageUrl(null);
    setError('');
    trackTool('image');
    try {
      const url = await byrdhouseImage(prompt);
      setImageUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setLoading(false);
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🎨 Image Gen</h3><span className="text-xs text-green-400">✓ Free</span></div>
      <form onSubmit={handleGenerate} className="space-y-2 mb-3">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A majestic mountain at sunset..." className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none h-16 text-sm" />
        <button type="submit" disabled={loading || !prompt} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '🎨 Generating...' : '🎨 Generate'}</button>
      </form>
      <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
        {loading ? <div className="text-center text-gray-400"><div className="text-4xl mb-2 animate-pulse">🎨</div><p className="text-sm">Creating image...</p></div>
         : error ? <p className="text-red-400 text-sm text-center px-4">{error}</p>
         : imageUrl ? <img src={imageUrl} alt="Generated" className="w-full h-full object-cover rounded-xl" />
         : <div className="text-center text-gray-500"><p className="text-4xl mb-2">🎨</p><p className="text-sm">Image appears here</p></div>}
      </div>
    </div>
  );
}

function VideoGenTool({ tier, trackTool }: { tier: string; trackTool: (id: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setVideoUrl(null);
    trackTool('video');
    try { const data = await byrdhouseVideo(prompt); if (data.videoUrl || data.imageUrl) setVideoUrl(data.videoUrl || data.imageUrl!); else setError(data.message || 'Video generation failed'); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🎬 Video Gen</h3><span className="text-xs text-purple-400">PRO</span></div>
      {tier === 'free' ? <div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-4xl mb-4">🔒</p><p className="text-gray-400">Pro Only</p></div></div> : <>
        <form onSubmit={handleGenerate} className="space-y-2 mb-3">
          <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your video..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm" />
          <button type="submit" disabled={loading || !prompt} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '🎬 Creating...' : '🎬 Generate'}</button>
        </form>
        {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
        <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">{loading ? <div className="text-center text-gray-400 animate-pulse">🎬 Generating video...</div> : videoUrl ? <video src={videoUrl} controls className="w-full h-full object-contain rounded-xl" /> : error ? <p className="text-red-400 text-sm text-center px-4">{error}</p> : <div className="text-center text-gray-500"><p className="text-4xl mb-2">🎬</p><p className="text-sm">AI video appears here</p></div>}</div>
      </>}
    </div>
  );
}

function MusicGenTool({ tier, trackTool }: { tier: string; trackTool: (id: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setAudioUrl('');
    trackTool('music');
    try { const data = await byrdhouseMusic(prompt); if (data.audioUrl) setAudioUrl(data.audioUrl); else setError(data.message || 'Music generation failed'); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🎵 Music Gen</h3><span className="text-xs text-purple-400">PRO</span></div>
      {tier === 'free' ? <div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-4xl mb-4">🔒</p><p className="text-gray-400">Pro Only</p></div></div> : <>
        <form onSubmit={handleGenerate} className="space-y-2 mb-3">
          <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Upbeat pop song about adventure..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm" />
          <button type="submit" disabled={loading || !prompt} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '🎵 Creating...' : '🎵 Generate'}</button>
        </form>
        {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
        <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">{loading ? <div className="text-center text-gray-400 animate-pulse">🎵 Generating music...</div> : audioUrl ? <audio src={audioUrl} controls className="w-full max-w-sm" /> : error ? <p className="text-red-400 text-sm text-center px-4">{error}</p> : <div className="text-center text-gray-500"><p className="text-4xl mb-2">🎵</p><p className="text-sm">AI music appears here</p></div>}</div>
      </>}
    </div>
  );
}

function AudioGenTool({ trackTool }: { trackTool: (id: string) => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    trackTool('audio');
    try {
      const result = await minimaxTTS(text);
      if (result.audioUrl) setAudioUrl(result.audioUrl);
      else if (result.status === 'browser-tts') setAudioUrl('browser-tts');
      else setError('No audio returned');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🎙️ Text to Speech</h3><span className="text-xs text-green-400">✓ Free</span></div>
      <form onSubmit={handleGenerate} className="space-y-2 mb-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Hello! This is AI text to speech." className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none h-20 text-sm" />
        <button type="submit" disabled={loading || !text} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50">{loading ? '🎙️ Generating...' : '🎙️ Generate'}</button>
      </form>
      {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
      <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
        {loading ? <div className="text-center text-gray-400"><div className="text-4xl mb-2 animate-pulse">🎙️</div><p className="text-sm">Synthesizing voice...</p></div>
         : audioUrl === 'browser-tts' ? <div className="text-center text-green-400 text-sm"><p>🔊 Playing via browser TTS</p></div>
         : audioUrl ? <audio src={audioUrl} controls className="w-full max-w-sm" />
         : <div className="text-center text-gray-500"><p className="text-4xl mb-2">🎙️</p><p className="text-sm">Natural voice synthesis</p></div>}
      </div>
    </div>
  );
}

function WriterTool({ trackTool }: { trackTool: (id: string) => void }) {
  const [input, setInput] = useState('');
  const [type, setType] = useState<'email' | 'article' | 'post'>('email');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    trackTool('writer');
    try { const result = await minimaxWrite(type, input); setOutput(result); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">✍️ AI Writer</h3><span className="text-xs text-green-400">✓ Free</span></div>
      <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-2 mb-3">
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"><option value="email">Email</option><option value="article">Article</option><option value="post">Social Post</option></select>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="What do you want to write about?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm" />
        <button type="submit" disabled={loading || !input} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '✍️ Writing...' : '✍️ Generate'}</button>
      </form>
      {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
      <div className="flex-1 bg-gray-800 rounded-xl p-3 overflow-y-auto"><pre className="text-sm text-white whitespace-pre-wrap font-sans">{output || 'Content appears here...'}</pre></div>
    </div>
  );
}

function CodeTool({ trackTool }: { trackTool: (id: string) => void }) {
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('python');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    trackTool('code');
    try { const result = await minimaxCode(language, input); setOutput(result); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">💻 Code AI</h3><span className="text-xs text-green-400">✓ Free</span></div>
      <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-2 mb-3">
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"><option value="python">Python</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option></select>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe what code you need..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm" />
        <button type="submit" disabled={loading || !input} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '💻 Coding...' : '💻 Generate'}</button>
      </form>
      {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
      <div className="flex-1 bg-gray-800 rounded-xl p-3 overflow-y-auto font-mono text-sm"><pre className="text-green-400 whitespace-pre-wrap">{output || 'Code appears here...'}</pre></div>
    </div>
  );
}

function TranslatorTool({ trackTool }: { trackTool: (id: string) => void }) {
  const [input, setInput] = useState('');
  const [toLang, setToLang] = useState('es');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const handleTranslate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    trackTool('translate');
    try { const result = await minimaxTranslate(input, toLang); setOutput(result); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🌐 Translator</h3><span className="text-xs text-green-400">✓ Free</span></div>
      <div className="mb-3">
        <select value={toLang} onChange={(e) => setToLang(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm mb-2">
          <option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="zh">Chinese</option><option value="ja">Japanese</option><option value="ko">Korean</option><option value="pt">Portuguese</option><option value="it">Italian</option><option value="ru">Russian</option><option value="ar">Arabic</option>
        </select>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter text to translate..." className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none h-20 text-sm" />
      </div>
      <button onClick={handleTranslate} disabled={loading || !input} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm mb-3">{loading ? '🌐 Translating...' : '🌐 Translate'}</button>
      {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
      <div className="flex-1 bg-gray-800 rounded-xl p-3 overflow-y-auto"><pre className="text-sm text-white whitespace-pre-wrap">{output || 'Translation appears here'}</pre></div>
    </div>
  );
}

function ThumbnailTool({ tier, trackTool }: { tier: string; trackTool: (id: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    trackTool('thumbnail');
    try { const url = await byrdhouseThumbnail(`${prompt}, YouTube thumbnail, bold typography, high contrast`); setImageUrl(url); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🖼️ Thumbnail Gen</h3><span className="text-xs text-purple-400">PRO</span></div>
      {tier === 'free' ? <div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-4xl mb-4">🔒</p><p className="text-gray-400">Pro Only</p></div></div> : <>
        <form onSubmit={handleGenerate} className="space-y-2 mb-3">
          <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Epic gaming setup..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm" />
          <button type="submit" disabled={loading || !prompt} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '🖼️ Creating...' : '🖼️ Create'}</button>
        </form>
        {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
        <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">{imageUrl ? <img src={imageUrl} alt="Thumb" className="w-full h-full object-cover rounded-xl" /> : <div className="text-center text-gray-500"><p className="text-4xl mb-2">🖼️</p><p className="text-sm">16:9 thumbnails</p></div>}</div>
      </>}
    </div>
  );
}

function PDFTool({ trackTool }: { trackTool: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setError('');
    trackTool('pdf');
    try {
      const url = await generateClientPDF(title, content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.pdf`;
      a.click();
      setDone(true);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">📄 PDF Creator</h3><span className="text-xs text-green-400">✓ Free</span></div>
      <form onSubmit={handleGenerate} className="space-y-2 mb-3">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Document content..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm h-20 resize-none" />
        <button type="submit" disabled={loading || !title || !content} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '📄 Creating...' : '📄 Generate PDF'}</button>
      </form>
      {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
      <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center"><div className="text-center text-gray-500">{done ? <p className="text-green-400">✓ PDF Downloaded!</p> : <><p className="text-4xl mb-2">📄</p><p className="text-sm">Professional PDFs</p></>}</div></div>
    </div>
  );
}

function SlidesTool({ trackTool }: { trackTool: (id: string) => void }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    // Load pptxgenjs from CDN
    if (!(window as any).PptxGenJS) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js';
      document.head.appendChild(s);
    }
  }, []);
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    trackTool('slides');
    try {
      await generateClientPPTX(topic);
      setDone(true);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">📊 Presentation</h3><span className="text-xs text-green-400">✓ Free</span></div>
      <form onSubmit={handleGenerate} className="space-y-2 mb-3">
        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Presentation topic..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm" />
        <button type="submit" disabled={loading || !topic} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '📊 Creating...' : '📊 Generate'}</button>
      </form>
      {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
      <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center"><div className="text-center text-gray-500">{done ? <p className="text-green-400">✓ PPT Downloaded!</p> : <><p className="text-4xl mb-2">📊</p><p className="text-sm">Stunning slide decks</p></>}</div></div>
    </div>
  );
}

function BGRemoveTool({ tier, trackTool }: { tier: string; trackTool: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    trackTool('bgremove');
    try {
      const data = await byrdhouseBGRemove(file);
      setResult(data.imageUrl);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🪄 BG Remover</h3><span className="text-xs text-purple-400">PRO</span></div>
      {tier === 'free' ? <div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-4xl mb-4">🔒</p><p className="text-gray-400">Pro Only</p></div></div> : <>
        <div className="mb-3">
          <label className="w-full px-4 py-8 bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl text-center cursor-pointer hover:border-purple-500 transition-colors">
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm text-gray-400">Click to upload image</p>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
        {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
        <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">{loading ? <div className="text-center text-gray-400 animate-pulse">🪄 Removing background...</div> : result ? <img src={result} alt="Result" className="w-full h-full object-contain" /> : <div className="text-center text-gray-500"><p className="text-4xl mb-2">🪄</p><p className="text-sm">Background removed</p></div>}</div>
      </>}
    </div>
  );
}

function LogoTool({ tier, trackTool }: { tier: string; trackTool: (id: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    trackTool('logo');
    try { const url = await byrdhouseLogo(`${prompt}, professional logo design, vector style, minimalist, transparent background`); setResult(url); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🏷️ Logo Maker</h3><span className="text-xs text-purple-400">PRO</span></div>
      {tier === 'free' ? <div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-4xl mb-4">🔒</p><p className="text-gray-400">Pro Only</p></div></div> : <>
        <form onSubmit={handleGenerate} className="space-y-2 mb-3">
          <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Brand name or style..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm" />
          <button type="submit" disabled={loading || !prompt} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '🏷️ Creating...' : '🏷️ Generate'}</button>
        </form>
        {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
        <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">{result ? <img src={result} alt="Logo" className="w-full h-full object-contain" /> : <div className="text-center text-gray-500"><p className="text-4xl mb-2">🏷️</p><p className="text-sm">Professional logos</p></div>}</div>
      </>}
    </div>
  );
}

function ImageEditTool({ tier, trackTool }: { tier: string; trackTool: (id: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    trackTool('imageedit');
    try {
      const data = await byrdhouseFetch<{imageUrl: string}>('/image-edit', { prompt });
      setResult(data.imageUrl);
    }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🎯 Image Edit</h3><span className="text-xs text-purple-400">PRO</span></div>
      {tier === 'free' ? <div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-4xl mb-4">🔒</p><p className="text-gray-400">Pro Only</p></div></div> : <>
        <form onSubmit={handleGenerate} className="space-y-2 mb-3">
          <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Edit instruction..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm" />
          <button type="submit" disabled={loading || !prompt} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '🎯 Editing...' : '🎯 Edit'}</button>
        </form>
        {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
        <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">{result ? <img src={result} alt="Edited" className="w-full h-full object-cover" /> : <div className="text-center text-gray-500"><p className="text-4xl mb-2">🎯</p><p className="text-sm">Enhance & edit</p></div>}</div>
      </>}
    </div>
  );
}

function VoiceCloneTool({ tier, trackTool }: { tier: string; trackTool: (id: string) => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    trackTool('voiceover');
    try {
      const r = await minimaxTTS(text);
      if (r.audioUrl) setResult(r.audioUrl);
      else setError('No audio returned');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed'); }
    setLoading(false);
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">🎭 Voice Cloning</h3><span className="text-xs text-yellow-400">ENTERPRISE</span></div>
      {tier !== 'enterprise' ? <div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-4xl mb-4">🔒</p><p className="text-gray-400">Enterprise Only</p></div></div> : <>
        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-2 mb-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Text to narrate..." className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none h-20 text-sm" />
          <button type="submit" disabled={loading || !text} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium disabled:opacity-50 text-sm">{loading ? '🎭 Creating...' : '🎭 Generate'}</button>
        </form>
        {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
        <div className="flex-1 bg-gray-800 rounded-xl flex items-center justify-center"><div className="text-center text-gray-500">{result ? <audio src={result} controls className="w-full max-w-sm" /> : <><p className="text-4xl mb-2">🎭</p><p className="text-sm">Your voice, replicated</p></>}</div></div>
      </>}
    </div>
  );
}

// =============================================================================
// LANDING PAGE
// =============================================================================

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-pink-600/30 rounded-full blur-[120px]"></div>
        </div>
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600/20 rounded-full mb-10 border border-purple-500/40">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-sm text-purple-200 font-medium tracking-wide">15+ AI Tools Now Live</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight tracking-tight">
            Create Anything<br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">with AI Power</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-14 max-w-2xl mx-auto leading-relaxed font-light">
            Images, videos, music, code, documents and more — all powered by advanced AI.
            One platform, endless possibilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <button onClick={onGetStarted} className="px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-white font-bold text-lg shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/60 transition-all duration-300 hover:scale-105">
              🚀 Start Creating Free
            </button>
            <button onClick={() => document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' })} className="px-10 py-5 bg-gray-800 border border-gray-700 rounded-2xl text-white font-medium text-lg hover:bg-gray-700 hover:border-gray-600 transition-all duration-300">
              View All Tools →
            </button>
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-10 text-sm text-gray-400">
            <div className="flex items-center gap-2"><span className="text-green-400 font-bold">✓</span> No credit card required</div>
            <div className="flex items-center gap-2"><span className="text-green-400 font-bold">✓</span> 5 free tools</div>
            <div className="flex items-center gap-2"><span className="text-green-400 font-bold">✓</span> Instant results</div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-gray-900/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-5">Everything You Need to Create</h2>
            <p className="text-gray-400 text-lg">From idea to finished product in seconds</p>
          </div>
          <div className="grid md:grid-cols-3 gap-7">
            {[
              { icon: '🎨', title: 'Visual AI', desc: 'Generate stunning images, videos, and thumbnails with cutting-edge AI models.' },
              { icon: '🎵', title: 'Audio AI', desc: 'Create music, voiceovers, and text-to-speech in multiple languages and styles.' },
              { icon: '✍️', title: 'Content AI', desc: 'Write articles, emails, code, and presentations with intelligent AI assistance.' },
              { icon: '🪄', title: 'Editing Tools', desc: 'Remove backgrounds, enhance images, and perfect your visual content.' },
              { icon: '🌐', title: 'Translation', desc: 'Break language barriers with instant AI-powered translations.' },
              { icon: '📄', title: 'Documents', desc: 'Generate professional PDFs, presentations, and documents instantly.' }
            ].map((feature, i) => (
              <div key={i} className="bg-gray-800/60 border border-gray-700/70 rounded-2xl p-8 hover:border-purple-500/60 hover:bg-gray-800/80 transition-all duration-300 group cursor-default">
                <div className="text-4xl mb-5">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tools" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-5">15+ AI Tools at Your Fingertips</h2>
            <p className="text-gray-400 text-lg">Free tier includes 5 tools. Upgrade to Pro for unlimited access.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {TOOLS.map(tool => (
              <div key={tool.id} className={`bg-gray-800/50 border rounded-xl p-4 text-center ${tool.tier === 'free' ? 'border-gray-700/50' : tool.tier === 'pro' ? 'border-purple-500/30' : 'border-yellow-500/30'}`}>
                <div className="text-3xl mb-2">{tool.icon}</div>
                <h4 className="font-medium text-sm mb-1">{tool.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded ${tool.tier === 'free' ? 'bg-green-500/20 text-green-400' : tool.tier === 'pro' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {tool.tier === 'free' ? 'Free' : tool.tier === 'pro' ? 'Pro' : 'Enterprise'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-6 bg-gray-900/40">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-5">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 text-lg mb-16">Start free. Upgrade when you need more.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {SUBSCRIPTION_TIERS.map(tier => (
              <div key={tier.id} className={`relative bg-gray-800/80 rounded-3xl p-8 border transition-all duration-300 ${tier.id === 'pro' ? 'border-purple-500 shadow-2xl shadow-purple-500/20 scale-[1.03]' : 'border-gray-700/60 hover:border-gray-600'}`}>
                {tier.id === 'pro' && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xs font-bold text-white shadow-lg">MOST POPULAR</div>}
                <h3 className="text-xl font-bold mb-4 text-white">{tier.name}</h3>
                <div className="mb-8"><span className="text-5xl font-black text-white">${tier.price}</span>{tier.price > 0 && <span className="text-gray-400 ml-1">/mo</span>}</div>
                <ul className="text-left space-y-3 mb-10">{tier.features.map((f, i) => <li key={i} className="flex items-start gap-3 text-sm text-gray-300"><span className="text-green-400 font-bold mt-0.5">✓</span> {f}</li>)}</ul>
                <button onClick={onGetStarted} className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 ${tier.id === 'free' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/40 text-white'}`}>
                  {tier.id === 'free' ? 'Get Started Free' : `Get ${tier.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">Ready to Create?</h2>
          <p className="text-gray-400 text-lg mb-12">Join thousands of creators using AI to bring their ideas to life.</p>
          <button onClick={onGetStarted} className="px-14 py-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-white font-bold text-xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/60 transition-all duration-300 hover:scale-105">
            🚀 Get Started Free
          </button>
        </div>
      </section>

      <footer className="border-t border-gray-800 py-12 px-6 bg-gray-900/40">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={BYRDHOUSE_LOGO} alt="ByrdHouse" className="w-9 h-9 rounded-xl shadow-lg shadow-purple-500/30" />
            <span className="font-black text-xl text-white tracking-tight">ByrdHouse</span>
          </div>
          <p className="text-sm text-gray-500">© 2026 ByrdHouse. 15+ AI Tools for Creators.</p>
        </div>
      </footer>
    </div>
  );
}

// =============================================================================
// MAIN APP
// =============================================================================

function App() {
  const [page, setPage] = useState<'landing' | 'tools'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [showSubscription, setShowSubscription] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [stripeLoading, setStripeLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Admin panel
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'users' | 'tools' | 'activity' | 'settings'>('dashboard');

  // Real-time activity tracking
  const [activitySessions, setActivitySessions] = useState<Record<string, {
    tool: string;
    startedAt: number;
    calls: number;
    userId: string;
    userName: string;
    userEmail: string;
  }>>({});

  // Ads system
  const [adsEnabled, setAdsEnabled] = useState(!!localStorage.getItem('bh_ads_enabled'));
  const AD_BANNERS = [
    { emoji: '🚀', title: 'Unlock All 15 Tools', body: 'Upgrade to Pro — unlimited access to every tool. No daily limits.', cta: 'Get Pro', action: () => setShowSubscription(true) },
    { emoji: '💎', title: 'Go Enterprise', body: 'White-label, priority support, API access, and unlimited everything.', cta: 'Learn More', action: () => setShowSubscription(true) },
    { emoji: '🔥', title: 'Pro Tip', body: 'Video Gen and Voice Cloning are the most powerful tools. Upgrade to unlock them.', cta: 'Try Now', action: () => setShowSubscription(true) },
  ];
  const [currentAd, setCurrentAd] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  useEffect(() => {
    const cycle = setInterval(() => setCurrentAd(i => (i + 1) % AD_BANNERS.length), 8000);
    return () => clearInterval(cycle);
  }, []);

  const ADMIN_PASSCODE = localStorage.getItem('bh_admin_pass');

  const handleAdminLogin = () => {
    if (!adminPass) return;
    if (!ADMIN_PASSCODE) { alert('⚠️ No passcode set. Go to Admin Settings to set one first.'); return; }
    if (adminPass === ADMIN_PASSCODE) {
      setAdminAuthenticated(true);
      setAdminPass('');
    } else {
      alert('Invalid passcode');
    }
  };

  const getAllUsers = (): User[] => {
    try {
      const stored = localStorage.getItem('byrdhouse_user');
      if (stored) return [JSON.parse(stored)];
    } catch {}
    return [];
  };

  const updateUserTier = (userId: string, newTier: User['tier']) => {
    if (userId === user?.id) {
      const updated = { ...user, tier: newTier };
      setStorage('byrdhouse_user', updated);
      setUser(updated);
    }
  };

  const updateToolTier = (toolId: string, newTier: Tool['tier']) => {
    const idx = TOOLS.findIndex(t => t.id === toolId);
    if (idx >= 0) (TOOLS as any)[idx].tier = newTier;
  };

  const exportUsersCSV = () => {
    const users = getAllUsers();
    const csv = ['ID,Name,Email,Tier,Clicks,Referrals,Joined'].concat(
      users.map(u => `${u.id},${u.name},${u.email},${u.tier},${u.clicks},${u.referrals},${new Date(u.joinedAt).toLocaleDateString()}`)
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `byrdhouse-users-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const initStripe = () => {
    if (!(window as any).Stripe) return null;
    if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
      console.warn('Stripe publishable key not configured');
      return null;
    }
    return (window as any).Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  };

  useEffect(() => {
    const storedUser = getStorage('byrdhouse_user', null) as User | null;
    setUser(storedUser);
    if (storedUser) setPage('tools');
    // Load jsPDF dynamically
    if (!document.getElementById('jspdf-script')) {
      const s = document.createElement('script');
      s.id = 'jspdf-script';
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      document.head.appendChild(s);
    }
  }, []);

  const handleGetStarted = () => {
    if (user) setPage('tools');
    else { setShowAuth(true); setAuthMode('signup'); }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail || !authPassword) { setAuthError('Fill all fields'); return; }
    if (authMode === 'signup' && !authName) { setAuthError('Enter name'); return; }
    const newUser: User = { id: Date.now().toString(), email: authEmail, name: authMode === 'signup' ? authName : authEmail.split('@')[0], tier: 'enterprise', clicks: 0, referrals: 0, joinedAt: Date.now() };
    setStorage('byrdhouse_user', newUser);
    setUser(newUser);
    setShowAuth(false);
    setPage('tools');
  };

  const handleSignOut = () => { localStorage.removeItem('byrdhouse_user'); setUser(null); setPage('landing'); };

const trackTool = (toolId: string) => {
    if (user) {
      const updated = { ...user, clicks: user.clicks + 1 };
      setStorage('byrdhouse_user', updated);
      setUser(updated);
      // Track active session
      const sessionKey = `${user.id}_${toolId}`;
      setActivitySessions(prev => {
        const existing = prev[sessionKey];
        return {
          ...prev,
          [sessionKey]: {
            tool: toolId,
            startedAt: existing?.startedAt || Date.now(),
            calls: (existing?.calls || 0) + 1,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
          }
        };
      });
    }
  };

  const renderTool = (toolId: string) => {
    const tier = user?.tier || 'free';
    switch (toolId) {
      case 'chat': return <AIChatTool trackTool={trackTool} />;
      case 'image': return <ImageGenTool trackTool={trackTool} />;
      case 'video': return <VideoGenTool tier={tier} trackTool={trackTool} />;
      case 'music': return <MusicGenTool tier={tier} trackTool={trackTool} />;
      case 'audio': return <AudioGenTool trackTool={trackTool} />;
      case 'writer': return <WriterTool trackTool={trackTool} />;
      case 'code': return <CodeTool trackTool={trackTool} />;
      case 'translate': return <TranslatorTool trackTool={trackTool} />;
      case 'thumbnail': return <ThumbnailTool tier={tier} trackTool={trackTool} />;
      case 'pdf': return <PDFTool trackTool={trackTool} />;
      case 'slides': return <SlidesTool trackTool={trackTool} />;
      case 'bgremove': return <BGRemoveTool tier={tier} trackTool={trackTool} />;
      case 'logo': return <LogoTool tier={tier} trackTool={trackTool} />;
      case 'imageedit': return <ImageEditTool tier={tier} trackTool={trackTool} />;
      case 'voiceover': return <VoiceCloneTool tier={tier} trackTool={trackTool} />;
      default: return null;
    }
  };

  const handleUpgrade = async (tier: string) => {
    if (tier === 'free') { setShowSubscription(false); setPage('tools'); return; }
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    setStripeLoading(true);
    try {
      // First try to get a checkout session from our backend (more reliable)
      const resp = await fetch(`${backendUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval: billingInterval, userId: user?.id }),
      });
      const data = await resp.json();
      if (resp.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      // Fallback: use Stripe.js client-side redirect if backend not configured
      if (data.error?.includes('not configured') || data.error?.includes('Invalid')) {
        const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!stripeKey || stripeKey === 'pk_live_placeholder') {
          alert('💳 Stripe integration requires backend configuration. Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in .env to enable payments.');
          setShowSubscription(false);
          return;
        }
        const priceMap: Record<string, Record<string, string>> = {
          pro: { monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY, yearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY },
          enterprise: { monthly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY, yearly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_YEARLY },
        };
        const priceId = priceMap[tier]?.[billingInterval];
        if (!priceId) throw new Error('Price configuration missing in .env');
        const stripe = initStripe();
        if (!stripe) throw new Error('Stripe failed to initialize');
        const { error } = await stripe.redirectToCheckout({
          lineItems: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          successUrl: `${window.location.origin}?upgrade=success`,
          cancelUrl: window.location.href,
        });
        if (error) alert(`Checkout error: ${error.message}`);
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Upgrade error:', err);
      alert(`Checkout failed: ${err.message}`);
    }
    setStripeLoading(false);
  };

  // Handle upgrade success/cancel from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      const newUser = user ? { ...user, tier: 'enterprise' } : null;
      if (newUser) setStorage('byrdhouse_user', newUser);
      setUser(newUser);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('upgrade') === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  if (page === 'landing') {
    return (
      <>
        <LandingPage onGetStarted={handleGetStarted} />
        {showAuth && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-purple-500/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
                <button onClick={() => setShowAuth(false)} className="text-gray-400 hover:text-white text-xl">×</button>
              </div>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && <input type="text" placeholder="Your Name" value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500" />}
                <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500" />
                <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500" />
                {authError && <p className="text-red-400 text-sm">{authError}</p>}
                <button type="submit" className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold">{authMode === 'signin' ? 'Sign In' : 'Create Account'}</button>
              </form>
              <div className="mt-4 text-center">
                <p className="text-gray-400 text-sm">{authMode === 'signin' ? "Don't have?" : "Already have?"} <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="text-purple-400 ml-2">{authMode === 'signin' ? 'Sign Up' : 'Sign In'}</button></p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => setPage('landing')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={BYRDHOUSE_LOGO} alt="ByrdHouse" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="text-xl font-black tracking-tight">ByrdHouse</h1>
              <p className="text-xs text-gray-400 font-medium">AI Tools Platform</p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-lg text-xs bg-green-500/20 text-green-400">✓ All Tools Live</div>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-gray-800 rounded-lg flex items-center gap-2">
                  <span>{user.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${user.tier !== 'free' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-600'}`}>{user.tier.toUpperCase()}</span>
                </div>
                <button onClick={handleSignOut} className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm">Sign Out</button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-sm font-medium">Sign In</button>
            )}
            <button onClick={() => setShowSubscription(true)} className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-sm font-medium">💎 Upgrade</button>
            <button onClick={() => setShowAdmin(true)} className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm hover:bg-gray-600">⚙️ Admin</button>
          </div>
        </div>
      </header>

      {adsEnabled && !user && (
        <div className="bg-gradient-to-r from-yellow-600/20 via-amber-600/20 to-yellow-600/20 border-b border-yellow-500/30">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{AD_BANNERS[currentAd].emoji}</span>
              <div>
                <div className="text-sm font-bold text-yellow-300">{AD_BANNERS[currentAd].title}</div>
                <div className="text-xs text-yellow-200/70">{AD_BANNERS[currentAd].body}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={AD_BANNERS[currentAd].action} className="px-4 py-1.5 bg-yellow-500 text-black rounded-lg text-sm font-bold hover:bg-yellow-400">{AD_BANNERS[currentAd].cta}</button>
              <button onClick={() => { localStorage.removeItem('bh_ads_enabled'); setAdsEnabled(false); }} className="text-yellow-400/60 hover:text-yellow-300 text-lg">×</button>
            </div>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-purple-500/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
              <button onClick={() => setShowAuth(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && <input type="text" placeholder="Your Name" value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500" />}
              <input type="email" placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500" />
              <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500" />
              {authError && <p className="text-red-400 text-sm">{authError}</p>}
              <button type="submit" className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold">{authMode === 'signin' ? 'Sign In' : 'Create Account'}</button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-sm">{authMode === 'signin' ? "Don't have?" : "Already have?"} <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="text-purple-400 ml-2">{authMode === 'signin' ? 'Sign Up' : 'Sign In'}</button></p>
            </div>
          </div>
        </div>
      )}

      {showSubscription && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-4xl w-full border border-purple-500/30 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">💎 Choose Your Plan</h2>
              <button onClick={() => setShowSubscription(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            {/* Billing Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-900 rounded-xl p-1 flex">
                <button onClick={() => setBillingInterval('monthly')} className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${billingInterval === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Monthly</button>
                <button onClick={() => setBillingInterval('yearly')} className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${billingInterval === 'yearly' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Yearly <span className="text-green-400 ml-1">-17%</span></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SUBSCRIPTION_TIERS.map(tier => {
                const displayPrice = billingInterval === 'yearly' && tier.yearlyPrice ? Math.round(tier.price * 0.83) : tier.price;
                return (
                <div key={tier.id} className={`bg-gray-900/50 rounded-2xl p-6 border ${tier.id === 'pro' ? 'border-purple-500 shadow-lg shadow-purple-500/20 scale-105' : 'border-gray-700'}`}>
                  {tier.id === 'pro' && <div className="text-center text-purple-400 text-sm font-bold mb-2">MOST POPULAR</div>}
                  <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                  <div className="mb-4"><span className="text-3xl font-bold">${displayPrice}</span><span className="text-gray-500">/mo</span>{billingInterval === 'yearly' && <span className="text-xs text-green-400 ml-2">billed annually</span>}</div>
                  <ul className="space-y-2 mb-6">{tier.features.map((f, i) => <li key={i} className="flex items-center gap-2 text-sm text-gray-300"><span className="text-green-400">✓</span> {f}</li>)}</ul>
                  <button onClick={() => handleUpgrade(tier.id)} disabled={stripeLoading} className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                    {stripeLoading ? 'Redirecting...' : `Get ${tier.name}`}
                  </button>
                </div>
              )})}
            </div>
            <p className="text-center text-gray-500 text-xs mt-6">🔒 Secured by Stripe. Cancel anytime. No hidden fees.</p>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {showAdmin && !adminAuthenticated && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-purple-500/30">
            <h2 className="text-2xl font-bold mb-6">🔐 Admin Access</h2>
            <input type="password" placeholder="Enter admin passcode" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 mb-4" />
            <button onClick={handleAdminLogin} className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold">Unlock</button>
            <button onClick={() => { setShowAdmin(false); setAdminPass(''); }} className="w-full mt-2 px-4 py-2 bg-gray-700 rounded-xl text-gray-400 text-sm">Cancel</button>
            <p className="text-gray-400 text-xs text-center mt-4">Set a passcode first in Admin Settings tab</p>
          </div>
        </div>
      )}

      {showAdmin && adminAuthenticated && (
        <div className="fixed inset-0 bg-black/90 z-50 flex">
          <div className="w-64 bg-gray-900 border-r border-gray-700 p-6 flex flex-col gap-2">
            <h2 className="text-lg font-bold mb-4 text-purple-400">⚙️ Admin Panel</h2>
{(['dashboard','users','tools','activity','settings'] as const).map(tab => (
              <button key={tab} onClick={() => setAdminTab(tab)} className={`px-4 py-2 rounded-lg text-left capitalize ${adminTab === tab ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>{tab}</button>
            ))}
            <button onClick={() => { setShowAdmin(false); }} className="mt-4 px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-400">← Back to App</button>
            <button onClick={() => { setAdminAuthenticated(false); setShowAdmin(false); }} className="px-4 py-2 bg-red-900/50 rounded-lg text-sm text-red-400">Logout</button>
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            {adminTab === 'dashboard' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">📊 Dashboard</h2>
                <div className="grid grid-cols-3 gap-6">
                  {[['Total Users', '1', 'bg-blue-500/20 text-blue-400'],['Pro Members','0','bg-purple-500/20 text-purple-400'],['Total Clicks','0','bg-green-500/20 text-green-400']].map(([label,val,bg]) => (
                    <div key={label as string} className={`rounded-2xl p-6 border ${bg}`}>
                      <div className="text-3xl font-bold">{val}</div>
                      <div className="text-sm mt-1 opacity-70">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {TOOLS.slice(0,6).map(tool => (
                    <div key={tool.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{tool.icon}</span>
                        <span className="font-semibold">{tool.name}</span>
                      </div>
                      <div className="text-xs text-gray-400">Tier: <span className="capitalize text-purple-400">{tool.tier}</span> • Clicks: {tool.clicks} • Revenue: ${tool.revenue}/use</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {adminTab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">👥 User Management</h2>
                  <button onClick={exportUsersCSV} className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600">📥 Export CSV</button>
                </div>
                <div className="space-y-3">
                  {getAllUsers().length === 0 ? (
                    <p className="text-gray-500">No users yet.</p>
                  ) : getAllUsers().map(u => (
                    <div key={u.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between border border-gray-700/50">
                      <div>
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-sm text-gray-400">{u.email}</div>
                        <div className="text-xs text-gray-500 mt-1">Joined: {new Date(u.joinedAt).toLocaleDateString()} • {u.clicks} clicks</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={u.tier} onChange={(e) => updateUserTier(u.id, e.target.value as User['tier'])} className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm border border-gray-600">
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {adminTab === 'tools' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">🛠️ Tool Management</h2>
                <div className="grid grid-cols-2 gap-4">
                  {TOOLS.map(tool => {
                    const disabled = !!localStorage.getItem(`bh_tool_disabled_${tool.id}`);
                    const maintNote = localStorage.getItem(`bh_tool_maint_${tool.id}`) || 'Under maintenance';
                    return (
                    <div key={tool.id} className={`rounded-xl p-5 border ${disabled ? 'border-red-500/40 bg-red-900/10' : 'border-gray-700/50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{tool.icon}</span>
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {tool.name}
                              {disabled && <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 font-bold">🔧 DOWN</span>}
                            </div>
                            <div className="text-xs text-gray-400">{tool.description}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-400">Tier: <span className={`capitalize font-bold ${tool.tier === 'free' ? 'text-green-400' : tool.tier === 'pro' ? 'text-purple-400' : 'text-yellow-400'}`}>{tool.tier}</span></span>
                        <select value={tool.tier} onChange={(e) => updateToolTier(tool.id, e.target.value as Tool['tier'])} className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm border border-gray-600">
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => {
                            if (disabled) {
                              localStorage.removeItem(`bh_tool_disabled_${tool.id}`);
                              localStorage.removeItem(`bh_tool_maint_${tool.id}`);
                            } else {
                              const note = prompt('Maintenance note (shown to users):', 'Under maintenance — back soon!');
                              if (note !== null) {
                                localStorage.setItem(`bh_tool_disabled_${tool.id}`, '1');
                                localStorage.setItem(`bh_tool_maint_${tool.id}`, note);
                              }
                            }
                            setForceUpdate(f => f + 1);
                          }}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold ${disabled ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600/80 hover:bg-red-500 text-white'}`}
                        >
                          {disabled ? '✅ Bring Online' : '🔧 Take Offline'}
                        </button>
                      </div>
                      {disabled && <div className="mt-2 text-xs text-red-400 bg-red-900/20 rounded px-2 py-1">📢 {maintNote}</div>}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
            {adminTab === 'activity' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">📡 Live Activity</h2>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                    <div className="text-2xl font-bold">{Object.keys(activitySessions).length}</div>
                    <div className="text-xs text-blue-300">Active Sessions</div>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                    <div className="text-2xl font-bold">{Object.values(activitySessions).reduce((s, a) => s + a.calls, 0)}</div>
                    <div className="text-xs text-green-300">Total Calls Today</div>
                  </div>
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4">
                    <div className="text-2xl font-bold">{new Set(Object.values(activitySessions).map(a => a.userId)).size}</div>
                    <div className="text-xs text-purple-300">Active Users</div>
                  </div>
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4">
                    <div className="text-2xl font-bold">
                      {(() => {
                        const sessions = Object.values(activitySessions);
                        if (!sessions.length) return '0m';
                        const now = Date.now();
                        const secs = Math.floor((now - Math.min(...sessions.map(s => s.startedAt))) / 1000);
                        if (secs < 60) return `${secs}s`;
                        const mins = Math.floor(secs / 60);
                        return `${mins}m`;
                      })()}
                    </div>
                    <div className="text-xs text-yellow-300">Longest Session</div>
                  </div>
                </div>
                {/* Tool breakdown */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Tool Usage</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(() => {
                      const toolMap: Record<string, number> = {};
                      Object.values(activitySessions).forEach(s => {
                        toolMap[s.tool] = (toolMap[s.tool] || 0) + s.calls;
                      });
                      return TOOLS.map(tool => {
                        const calls = toolMap[tool.id] || 0;
                        const total = Object.values(toolMap).reduce((a, b) => a + b, 0) || 1;
                        return (
                          <div key={tool.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xl">{tool.icon}</span>
                              <span className="text-sm font-bold text-white">{calls}</span>
                            </div>
                            <div className="text-xs text-gray-400">{tool.name}</div>
                            <div className="mt-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${Math.round((calls / total) * 100)}%` }} />
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{Math.round((calls / total) * 100)}%</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                {/* Active users table */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">User Sessions</h3>
                  {Object.keys(activitySessions).length === 0 ? (
                    <p className="text-gray-500 text-sm">No active sessions — sessions appear when users interact with tools.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(activitySessions)
                        .sort((a, b) => b[1].calls - a[1].calls)
                        .map(([key, session]) => {
                          const tool = TOOLS.find(t => t.id === session.tool);
                          const ageMs = Date.now() - session.startedAt;
                          const ageMin = Math.floor(ageMs / 60000);
                          const ageSec = Math.floor((ageMs % 60000) / 1000);
                          return (
                            <div key={key} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between border border-gray-700/50">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                                  {session.userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-sm">{session.userName}</div>
                                  <div className="text-xs text-gray-400">{session.userEmail}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <div className="text-lg">{tool?.icon || '❓'}</div>
                                  <div className="text-xs text-gray-400">{tool?.name || session.tool}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-bold text-green-400">{session.calls}</div>
                                  <div className="text-xs text-gray-400">calls</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm font-bold text-purple-400">{ageMin > 0 ? `${ageMin}m ` : ''}{ageSec}s</div>
                                  <div className="text-xs text-gray-400">active</div>
                                </div>
                                <div className="text-xs text-gray-500">{new Date(session.startedAt).toLocaleTimeString()}</div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}
            {adminTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">⚙️ Settings</h2>
                <div className="space-y-6 max-w-xl">
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="font-semibold mb-4 text-purple-400">🔑 Admin Passcode</h3>
                    <div className="flex gap-2">
                      <input type="password" id="adminNewPass" placeholder="New passcode" className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" />
                      <button onClick={() => { const inp = document.getElementById('adminNewPass') as HTMLInputElement; if(inp?.value) { localStorage.setItem('bh_admin_pass', inp.value); alert('Passcode updated!'); inp.value=''; }}} className="px-4 py-2 bg-purple-600 rounded-lg text-sm">Save</button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Current: {ADMIN_PASSCODE || 'Not set'}</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="font-semibold mb-4 text-purple-400">🌐 API Configuration</h3>
                    <div className="space-y-3">
                      {[
                        ['MiniMax API Key', import.meta.env.VITE_MINIMAX_API_KEY ? '•••••••' + import.meta.env.VITE_MINIMAX_API_KEY.slice(-4) : 'Not set (use VITE_MINIMAX_API_KEY)', 'VITE_MINIMAX_API_KEY'],
                        ['Backend URL', import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001', 'VITE_BACKEND_URL'],
                        ['Stripe Key', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Configured ✓' : 'Not set', 'VITE_STRIPE_PUBLISHABLE_KEY']
                      ].map(([label,val]) => (
                        <div key={label as string} className="flex justify-between items-center py-2 border-b border-gray-700/50">
                          <span className="text-sm text-gray-400">{label}</span>
                          <span className={`text-sm ${val.toString().startsWith('Not') || val.toString() === 'Not configured' ? 'text-red-400' : 'text-green-400'}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="font-semibold mb-4 text-purple-400">📦 Subscription Tiers</h3>
                    <div className="space-y-2">
                      {SUBSCRIPTION_TIERS.map(tier => (
                        <div key={tier.id} className="flex justify-between items-center py-2 border-b border-gray-700/50">
                          <span className="capitalize font-medium">{tier.name}</span>
                          <span className="text-gray-400">${tier.price}/mo ($${tier.yearlyPrice}/yr)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTool ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setActiveTool(null)} className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600">← Back to Tools</button>
            </div>
            {renderTool(activeTool)}
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-purple-900/50 rounded-2xl p-6 mb-8 border border-purple-500/30">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">🚀 15 AI Tools Ready!</h3>
                  <p className="text-gray-400">Click any tool below to start creating</p>
                </div>
                <button onClick={() => setShowSubscription(true)} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold whitespace-nowrap">Upgrade to Pro →</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {TOOLS.map(tool => {
                const disabled = !!localStorage.getItem(`bh_tool_disabled_${tool.id}`);
                const maintNote = localStorage.getItem(`bh_tool_maint_${tool.id}`) || 'Under maintenance';
                return (
                <div key={tool.id}
                  onClick={() => {
                    if (disabled) { alert(`🔧 ${tool.name} is under maintenance.\n${maintNote}`); return; }
                    setActiveTool(tool.id);
                  }}
                  className={`bg-gray-800/50 border rounded-xl p-4 hover:border-purple-500/50 transition-all cursor-pointer group ${disabled ? 'opacity-50 border-red-500/30 hover:border-red-500/50' : 'border-gray-700/50'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-2xl">{tool.icon}</div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded text-xs ${tool.tier === 'free' ? 'bg-green-500/20 text-green-400' : tool.tier === 'pro' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{tool.tier}</span>
                      {disabled && <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 font-bold">🔧</span>}
                    </div>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{tool.name}</h3>
                  {disabled ? (
                    <p className="text-xs text-red-400 mt-1">🔧 {maintNote}</p>
                  ) : (
                    <p className="text-sm text-gray-500">{tool.description}</p>
                  )}
                  <button className={`w-full mt-3 py-2 rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity ${disabled ? 'bg-red-600 text-white' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}>
                    {disabled ? 'Offline' : 'Open →'}
                  </button>
                </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-600 text-sm">© 2026 ByrdHouse • 15 AI Tools for Creators</p>
        </div>
      </footer>
    </div>
  );
}

export default App;