import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Sparkles, Send, BrainCircuit, Activity, LineChart, 
  Settings, AlertTriangle, ShieldCheck, ChevronRight, User as UserIcon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { UserSession, CompanyTenant } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { collection, query, getDocs, setDoc, doc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { PredictiveAnalyticsDashboard } from '../bi/PredictiveAnalyticsDashboard';

interface AiAssistantScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
}

type TabType = 'ASSISTANT' | 'PREDICTIVE' | 'ANOMALIES' | 'GOVERNANCE';

export const AiAssistantScreen: React.FC<AiAssistantScreenProps> = ({ userSession, activeCompany }) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('ASSISTANT');
  
  // Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Governance Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!activeCompany) return;
    const unsub = onSnapshot(query(collection(db, 'companies', activeCompany.companyId, 'ai_governance_logs'), orderBy('createdAt', 'desc')), snap => {
      setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeCompany]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeCompany || !userSession) return;
    
    const userMsg = {
      id: Date.now().toString(),
      role: 'USER',
      content: inputText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    
    // Log User Query to Governance
    try {
      await setDoc(doc(collection(db, 'companies', activeCompany.companyId, 'ai_governance_logs'), Date.now().toString()), {
        query: userMsg.content,
        userId: userSession.userId || (userSession as any).uid,
        userName: userSession.fullName || (userSession as any).displayName || 'User',
        status: 'PROCESSED',
        type: 'NATURAL_LANGUAGE_QUERY',
        createdAt: serverTimestamp()
      });
    } catch(err) {
      console.error('Failed to log AI governance event', err);
    }

    // Simulate AI Processing & Response
    setTimeout(() => {
      let aiResponse = "I have analyzed your request based on the current tenant data. However, the live AI model connection is not fully configured in this environment.";
      
      if (userMsg.content.toLowerCase().includes('attendance')) {
        aiResponse = "Based on recent attendance data, there is a 12% increase in late arrivals for the Security Department. I recommend reviewing the morning shift roster.";
      } else if (userMsg.content.toLowerCase().includes('payroll')) {
        aiResponse = "Payroll anomaly scan completed. 2 records show unusual overtime exceeding 20 hours this week. Please review employee ID 4490 and 5512.";
      } else if (userMsg.content.toLowerCase().includes('risk')) {
        aiResponse = "I have scanned the Risk Register. There is 1 Critical risk pending mitigation. Would you like me to draft an escalation notice?";
      }

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ASSISTANT',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className={`flex-1 h-full flex flex-col \${isDark ? 'text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-50'}`}>
      {/* Header */}
      <div className={`p-4 sm:p-6 border-b \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              Enterprise AI Intelligence
              <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Beta</span>
            </h1>
            <p className="text-sm text-slate-500">Natural Language Reporting, Predictive Analytics & Anomaly Detection</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex overflow-x-auto border-b scrollbar-none \${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        {[
          { id: 'ASSISTANT', label: 'AI Assistant', icon: Bot },
          { id: 'PREDICTIVE', label: 'Predictive Analytics', icon: LineChart },
          { id: 'ANOMALIES', label: 'Anomaly Detection', icon: AlertTriangle },
          { id: 'GOVERNANCE', label: 'AI Governance Logs', icon: ShieldCheck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap \${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto h-full space-y-6">

          {activeTab === 'ASSISTANT' && (
            <div className={`flex flex-col h-[calc(100vh-280px)] rounded-3xl border overflow-hidden \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Sparkles className="w-12 h-12 mb-4 text-indigo-400 opacity-50" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">How can I help you today?</h3>
                    <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                      <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition">Analyze attendance anomalies</span>
                      <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition">Predict next month's payroll cost</span>
                      <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition">Show critical risks</span>
                    </div>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex gap-4 \${msg.role === 'USER' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 \${
                        msg.role === 'USER' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {msg.role === 'USER' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`max-w-[75%] p-4 rounded-2xl \${
                        msg.role === 'USER' 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : isDark ? 'bg-slate-800 text-slate-200 rounded-tl-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                
                {isTyping && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className={`p-4 rounded-2xl rounded-tl-none \${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="flex gap-1 items-center h-5">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Chat Input */}
              <div className={`p-4 border-t \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <form onSubmit={handleSendMessage} className="relative flex items-center">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Ask AI to analyze data, find anomalies, or generate reports..."
                    className={`w-full pl-4 pr-12 py-4 rounded-2xl border outline-none text-sm transition-colors \${
                      isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'
                    }`}
                  />
                  <button 
                    type="submit" 
                    disabled={!inputText.trim()}
                    className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="mt-2 text-center text-[10px] text-slate-500 uppercase tracking-wide">
                  AI Governance Engine Enabled • Responses are logged for audit purposes
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PREDICTIVE' && (
             <div className="-mt-8">
               <PredictiveAnalyticsDashboard session={userSession} company={activeCompany} />
             </div>
          )}

          {activeTab === 'ANOMALIES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-6 rounded-3xl border \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">Attendance Anomalies</h3>
                    <p className="text-xs text-slate-500">AI-detected irregular patterns</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 border rounded-xl dark:border-slate-800 bg-amber-50 dark:bg-amber-900/10">
                    <h4 className="font-bold text-sm">Buddy Punching Risk</h4>
                    <p className="text-xs text-slate-500 mt-1">3 employees punched in from identical GPS coordinates within 2 seconds. High probability of proxy attendance.</p>
                    <button className="mt-3 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg">Investigate</button>
                  </div>
                  <div className="p-4 border rounded-xl dark:border-slate-800">
                    <h4 className="font-bold text-sm">Chronic Late Arrivals</h4>
                    <p className="text-xs text-slate-500 mt-1">Shift Group B shows a 45% increase in tardiness over the last 14 days compared to the historical baseline.</p>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">Payroll & Asset Anomalies</h3>
                    <p className="text-xs text-slate-500">Financial & physical discrepancies</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 border rounded-xl dark:border-slate-800 bg-rose-50 dark:bg-rose-900/10">
                    <h4 className="font-bold text-sm">Unusual Overtime Spike</h4>
                    <p className="text-xs text-slate-500 mt-1">Payroll pre-check detected 150% increase in overtime claims for Site North-02. Statistically anomalous.</p>
                    <button className="mt-3 px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg">Flag for Review</button>
                  </div>
                  <div className="p-4 border rounded-xl dark:border-slate-800">
                    <h4 className="font-bold text-sm">Asset Degradation Alert</h4>
                    <p className="text-xs text-slate-500 mt-1">HVAC Unit-7 requires maintenance 3 weeks earlier than predicted based on vibration sensor telemetry.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'GOVERNANCE' && (
            <div className={`p-6 rounded-3xl border \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    AI Governance & Audit Logs
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Tracking all AI model queries and dataset access</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b dark:border-slate-800 text-slate-500">
                      <th className="p-3 font-bold uppercase tracking-wider">Timestamp</th>
                      <th className="p-3 font-bold uppercase tracking-wider">User</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Query / Action</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Type</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">No AI queries logged yet.</td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleString() : 'Just now'}
                          </td>
                          <td className="p-3 font-medium">{log.userName}</td>
                          <td className="p-3 text-slate-500 max-w-xs truncate">{log.query}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-indigo-100 text-indigo-700 uppercase">
                              {log.type}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-700 uppercase">
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
