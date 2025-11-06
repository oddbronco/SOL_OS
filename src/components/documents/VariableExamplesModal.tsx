import React, { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface VariableExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VariableExamplesModal: React.FC<VariableExamplesModalProps> = ({ isOpen, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadExamples();
    }
  }, [isOpen]);

  const loadExamples = async () => {
    setLoading(true);
    try {
      const response = await fetch('/variable-examples.md');
      const text = await response.text();
      setContent(text);
    } catch (error) {
      console.error('Error loading examples:', error);
      setContent('# Error Loading Examples\n\nCould not load the variable examples documentation.');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: JSX.Element[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';

    lines.forEach((line, idx) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          elements.push(
            <pre key={`code-${idx}`} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          // Start code block
          codeBlockLang = line.substring(3);
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(<h1 key={idx} className="text-3xl font-bold text-gray-900 mb-4 mt-6">{line.substring(2)}</h1>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={idx} className="text-2xl font-bold text-gray-800 mb-3 mt-6 border-b-2 border-blue-200 pb-2">{line.substring(3)}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={idx} className="text-xl font-semibold text-gray-700 mb-2 mt-4">{line.substring(4)}</h3>);
      }
      // Horizontal rule
      else if (line.trim() === '---') {
        elements.push(<hr key={idx} className="my-6 border-gray-300" />);
      }
      // Lists
      else if (line.startsWith('- ')) {
        elements.push(<li key={idx} className="ml-6 mb-1 text-gray-700">{line.substring(2)}</li>);
      }
      // Inline code
      else if (line.includes('`')) {
        const parts = line.split('`');
        const formatted = parts.map((part, i) =>
          i % 2 === 0 ? part : <code key={i} className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono text-blue-600">{part}</code>
        );
        elements.push(<p key={idx} className="mb-2 text-gray-700">{formatted}</p>);
      }
      // Table rows
      else if (line.startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim());
        if (cells.every(c => c.trim().match(/^-+$/))) {
          // Skip separator row
          return;
        }
        const isHeader = !elements.some(el => el.type === 'table');
        if (isHeader) {
          elements.push(
            <table key={`table-${idx}`} className="w-full border-collapse mb-4 text-sm">
              <thead>
                <tr className="bg-blue-50 border-b-2 border-blue-200">
                  {cells.map((cell, i) => (
                    <th key={i} className="text-left p-3 font-semibold text-gray-900">{cell.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200" />
            </table>
          );
        } else {
          const lastTable = elements[elements.length - 1];
          if (lastTable.type === 'table') {
            const tbody = lastTable.props.children[1];
            const newRow = (
              <tr key={idx} className="hover:bg-gray-50">
                {cells.map((cell, i) => (
                  <td key={i} className="p-3 text-gray-700">{cell.trim()}</td>
                ))}
              </tr>
            );
            // Reconstruct table with new row
            elements[elements.length - 1] = (
              <table key={lastTable.key} className="w-full border-collapse mb-4 text-sm">
                {lastTable.props.children[0]}
                <tbody className="divide-y divide-gray-200">
                  {tbody.props.children ? [...(Array.isArray(tbody.props.children) ? tbody.props.children : [tbody.props.children]), newRow] : [newRow]}
                </tbody>
              </table>
            );
          }
        }
      }
      // Bold text
      else if (line.includes('**')) {
        const parts = line.split('**');
        const formatted = parts.map((part, i) =>
          i % 2 === 0 ? part : <strong key={i} className="font-semibold text-gray-900">{part}</strong>
        );
        elements.push(<p key={idx} className="mb-2 text-gray-700">{formatted}</p>);
      }
      // Regular paragraph
      else if (line.trim()) {
        elements.push(<p key={idx} className="mb-2 text-gray-700">{line}</p>);
      }
      // Empty line
      else {
        elements.push(<div key={idx} className="h-2" />);
      }
    });

    return elements;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Template Variable Examples</h2>
              <p className="text-sm text-gray-600">See exactly what data each variable provides</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading examples...</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {renderMarkdown(content)}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
