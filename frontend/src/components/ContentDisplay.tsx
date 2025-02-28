import React from 'react';
import { marked } from 'marked';

type Props = {
  content: string;
  title: string;
  onCopy: () => void;
  isMarkdown: boolean;
}

export const ContentDisplay: React.FC<Props> = ({
  content,
  title,
  onCopy,
  isMarkdown
}) => {
  // For markdown content, use marked to convert it to HTML
  const displayContent = isMarkdown
    ? { __html: marked(content) }
    : { __html: content.replace(/\n/g, '<br/>') };

  return (
    <div className="content-display">
      <div className="content-header">
        <h3>{title}</h3>
        <button onClick={onCopy} className="copy-button">
          Copy
        </button>
      </div>
      
      <div className="content-body">
        {isMarkdown ? (
          <div 
            className="markdown-content" 
            dangerouslySetInnerHTML={displayContent}
          />
        ) : (
          <div 
            className="text-content" 
            dangerouslySetInnerHTML={displayContent}
          />
        )}
      </div>
    </div>
  );
};
