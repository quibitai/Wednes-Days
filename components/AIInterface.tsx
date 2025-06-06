'use client';

import { useState } from 'react';
import { Send, Bot, User, Clock, CheckCircle, XCircle } from 'lucide-react';

interface AIInterfaceProps {
  userId: 'personA' | 'personB';
  currentSchedule: Record<string, any>;
}

export default function AIInterface({ userId, currentSchedule }: AIInterfaceProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai' | 'system';
    content: string;
    timestamp: string;
    success?: boolean;
    data?: any;
  }>>([
    {
      id: '1',
      type: 'system',
      content: 'Hi! I can help you with schedule changes. Try saying something like "I\'m unavailable next Tuesday and Wednesday" or "I need to swap my days next week".',
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Parse natural language input
      const parseResponse = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: userMessage.content,
          userId
        })
      });

      const parseResult = await parseResponse.json();

      if (parseResult.success && parseResult.data) {
        // Successfully parsed - show what was understood
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: `I understand you want to: ${parseResult.data.action.replace('_', ' ')}
          
📅 Dates: ${parseResult.data.dates.join(', ')}
💭 Reason: ${parseResult.data.reason}
🤖 Confidence: ${Math.round(parseResult.data.confidence * 100)}%

Would you like me to generate a schedule proposal for these changes?`,
          timestamp: new Date().toISOString(),
          success: true,
          data: parseResult.data
        };

        setMessages(prev => [...prev, aiMessage]);

        // Auto-generate proposal if confidence is high enough
        if (parseResult.data.confidence > 0.8 && parseResult.data.action === 'request_swap') {
          await generateProposal(parseResult.data.dates, parseResult.data.reason, parseResult.data.preferences);
        }

      } else {
        // Parsing failed or low confidence
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: parseResult.error || 'I couldn\'t understand your request. Could you try rephrasing it?',
          timestamp: new Date().toISOString(),
          success: false
        };

        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        success: false
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateProposal = async (dates: string[], reason: string, preferences: any) => {
    try {
      const proposalResponse = await fetch('/api/ai/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          unavailableDates: dates,
          currentSchedule,
          userId,
          reason,
          preferences
        })
      });

      const proposalResult = await proposalResponse.json();

      if (proposalResult.success) {
        const proposalMessage = {
          id: (Date.now() + 2).toString(),
          type: 'ai' as const,
          content: `✅ Schedule proposal created!

📋 **${proposalResult.proposal.title}**
📅 Affected dates: ${proposalResult.proposal.affectedDateRange.start} to ${proposalResult.proposal.affectedDateRange.end}
🔄 Handoff changes: ${proposalResult.proposal.handoffReduction.before} → ${proposalResult.proposal.handoffReduction.after}
🤖 AI Confidence: ${Math.round(proposalResult.proposal.aiConfidence * 100)}%

The proposal has been sent for approval. You'll receive a notification when it's reviewed.`,
          timestamp: new Date().toISOString(),
          success: true,
          data: proposalResult.proposal
        };

        setMessages(prev => [...prev, proposalMessage]);
      } else {
        const errorMessage = {
          id: (Date.now() + 2).toString(),
          type: 'ai' as const,
          content: `❌ Failed to create proposal: ${proposalResult.error}`,
          timestamp: new Date().toISOString(),
          success: false
        };

        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 2).toString(),
        type: 'ai' as const,
        content: '❌ Error creating proposal. Please try again.',
        timestamp: new Date().toISOString(),
        success: false
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-96">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-medium text-gray-900 dark:text-white">AI Schedule Assistant</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          User: {userId === 'personA' ? 'Adam' : 'Jane'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type !== 'user' && (
              <div className="flex-shrink-0">
                {message.type === 'ai' ? (
                  <Bot className={`w-6 h-6 ${message.success === false ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`} />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600" />
                )}
              </div>
            )}
            
            <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
              message.type === 'user'
                ? 'bg-blue-600 text-white'
                : message.success === false
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            }`}>
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 opacity-60" />
                <span className="text-xs opacity-60">{formatTime(message.timestamp)}</span>
                {message.type === 'ai' && message.success !== undefined && (
                  message.success ? (
                    <CheckCircle className="w-3 h-3 text-green-500 ml-1" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500 ml-1" />
                  )
                )}
              </div>
            </div>

            {message.type === 'user' && (
              <div className="flex-shrink-0">
                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your request... (e.g., 'I'm unavailable Tuesday and Wednesday')"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
} 