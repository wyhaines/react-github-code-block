import React, { useState, useEffect } from 'react';
import { Highlight, Prism, themes } from 'prism-react-renderer';
import rangeParser from 'parse-numeric-range';
import { twMerge } from 'tailwind-merge';
(typeof global !== 'undefined' ? global : window).Prism = Prism;

const languages = ['solidity', 'bash'];

const asyncImport = async (language) => {
  await import(`prismjs/components/prism-${language}`);
};

languages.forEach((language) => {
  asyncImport(language);
});

interface GitHubCodeBlockProps {
  language: string;
  org: string;
  repo: string;
  tag: string;
  path: string;
  lines: string;
  highlights: string;
}

const calculateLinesToHighlight = (raw) => {
  const lineNumbers = rangeParser(raw);
  if (lineNumbers) {
    return (index) => lineNumbers.includes(index + 1);
  } else {
    return () => false;
  }
};

const copyToClipboard = (str) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(str).then(
      function () {
        console.log('Copying to clipboard was successful!');
      },
      function (err) {
        console.error('Could not copy text: ', err);
      }
    );
  } else if (window.clipboardData) {
    // Internet Explorer
    window.clipboardData.setData('Text', str);
  }
};

const assembleContentUrl = (org, repo, tag, path, firstLine, lastLine) => {
  if (firstLine > 0) {
    return `https://github.com/${org}/${repo}/blob/${tag}/${path}#L${firstLine}-L${lastLine}`;
  } else {
    return `https://github.com/${org}/${repo}/blob/${tag}/${path}`;
  }
};

const firstAndLastLines = (code, lines) => {
  if (lines === '..') {
    lines = false;
  }

  let firstLine = 0;
  let lastLine = 0;

  if (lines) {
    const lineNumbers = rangeParser(lines);
    if (lineNumbers[0] > 0) {
      firstLine = lineNumbers[0] - 1;
      if (firstLine < 0) {
        firstLine = 0;
      }
    } else {
      firstLine = 0;
    }
    if (lineNumbers.slice(-1) > 0 && lineNumbers.slice(-1) > firstLine) {
      lastLine = lineNumbers.slice(-1) - 1;
      if (lastLine > code.split('\n').length - 1) {
        lastLine = code.split('\n').length - 1;
      }
    } else {
      lastLine = code.split('\n').length - 1;
    }
  } else {
    firstLine = 0;
    lastLine = code.split('\n').length - 1;
  }

  return [firstLine, lastLine];
};

const trimCode = (code, lines) => {
  const [firstLine, lastLine] = firstAndLastLines(code, lines);

  return code
    .split('\n')
    .slice(firstLine, lastLine + 1)
    .join('\n');
};

export const GitHubCodeBlock: React.FC<GitHubCodeBlockProps> = ({
  language = 'text',
  org,
  repo,
  tag = 'main',
  path,
  lines = '',
  highlights = '',
}) => {
  const [isCopied, setIsCopied] = React.useState(false);
  const className = `language-${language}`;
  const highlights_array = calculateLinesToHighlight(highlights);
  const [firstLine, setFirstLine] = useState(0);
  const [lastLine, setLastLine] = useState(0);
  const [contentUrl, setContentUrl] = useState(
    assembleContentUrl(org, repo, tag, path)
  );
  const [code, setCode] = useState(`Loading ${contentUrl}...`);

  useEffect(() => {
    fetch(
      `https://api.github.com/repos/${org}/${repo}/contents/${path}?ref=${tag}`
    )
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        if (data.message != 'Not Found') {
          const parsed_code = trimCode(atob(data.content), lines);
          setCode(parsed_code);
          if (lines != '') {
            console.log(lines);
            const [_firstLine, _lastLine] = firstAndLastLines(parsed_code, lines);
            setFirstLine(_firstLine + 1);
            setLastLine(_lastLine + 1);
            setContentUrl(
              assembleContentUrl(
                org,
                repo,
                tag,
                path,
                _firstLine + 1,
                _lastLine + 1
              )
            );
          }
        }
      });
  }, []);

  return (
    <div className={twMerge('githubblock')}>
      <div className={twMerge('header')}>
        <div className={twMerge('language')}>{`${language}`}</div>
        <div className={twMerge('spacer')}></div>
        <button
          onClick={() => {
            copyToClipboard(code);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 1000);
          }}
          className={twMerge('button')}
        >
          {isCopied ? '🎉 Copied!' : 'Copy'}
        </button>
      </div>
      <div className={twMerge('code')}>
        <Highlight code={code} language={language} theme={themes.nightOwl}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={twMerge('code-wrapper', className)}
              style={{
                ...style,
              }}
            >
              {tokens.map((line, i) => (
                <div
                  {...getLineProps({ line, key: i })}
                  style={{
                    background: highlights_array(i)
                      ? '#00f5c426'
                      : 'transparent',
                    display: 'block',
                  }}
                ><div style={{   marginRight: '1rem', userSelect: 'none', float: 'left', width: '2.5rem', borderRight: '3px solid #606060', }}>{i + 1}</div>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token, key })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
      <div className={twMerge('url')}>
        <a href={contentUrl} target={'_blank'}>
          {path && contentUrl}
        </a>
      </div>
    </div>
  );
};
