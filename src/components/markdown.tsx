/**
 * Small dependency-free markdown renderer for lecture summaries.
 * Supports headings, paragraphs, lists, bold/italic/code, code blocks,
 * blockquotes, tables, images, horizontal rules and $formula$ emphasis.
 */
import { type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(==[^=]+==)|(\$[^$]+\$)|(!\[[^\]]*\]\([^)]+\))|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("==")) {
      nodes.push(
        <mark key={key++} className="rounded bg-sand px-1 text-foreground">
          {token.slice(2, -2)}
        </mark>,
      );
    } else if (token.startsWith("$")) {
      nodes.push(
        <span key={key++} className="font-serif italic">
          {token.slice(1, -1)}
        </span>,
      );
    } else if (token.startsWith("![")) {
      const alt = token.slice(2, token.indexOf("]"));
      const src = token.slice(token.indexOf("(") + 1, -1);
      nodes.push(<img key={key++} src={src} alt={alt} />);
    } else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]"));
      const href = token.slice(token.indexOf("(") + 1, -1);
      nodes.push(
        <a key={key++} href={href} className="text-accent underline" target="_blank" rel="noreferrer">
          {label}
        </a>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  const lines = (content ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3);
      const buffer: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buffer.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre key={key++}>
          <code data-lang={lang}>{buffer.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={key++} />);
      i++;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = inline(heading[2]);
      if (level === 1) blocks.push(<h1 key={key++}>{text}</h1>);
      else if (level === 2) blocks.push(<h2 key={key++}>{text}</h2>);
      else blocks.push(<h3 key={key++}>{text}</h3>);
      i++;
      continue;
    }

    if (line.trimStart().startsWith("> ")) {
      const buffer: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        buffer.push(lines[i].trimStart().slice(2));
        i++;
      }
      blocks.push(<blockquote key={key++}>{inline(buffer.join(" "))}</blockquote>);
      continue;
    }

    if (line.trimStart().startsWith("|") && line.includes("|", 1)) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <table key={key++}>
          {head && (
            <thead>
              <tr>
                {head.map((cell, index) => (
                  <th key={index}>{inline(cell)}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{inline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    const bullet = /^\s*[-*+]\s+/;
    if (bullet.test(line)) {
      const items: string[] = [];
      while (i < lines.length && bullet.test(lines[i])) {
        items.push(lines[i].replace(bullet, ""));
        i++;
      }
      blocks.push(
        <ul key={key++}>
          {items.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const numbered = /^\s*\d+[.)]\s+/;
    if (numbered.test(line)) {
      const items: string[] = [];
      while (i < lines.length && numbered.test(lines[i])) {
        items.push(lines[i].replace(numbered, ""));
        i++;
      }
      blocks.push(
        <ol key={key++}>
          {items.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,4}\s|\s*[-*+]\s|\s*\d+[.)]\s|>\s|\||```)/.test(lines[i])) {
      paragraph.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{inline(paragraph.join(" "))}</p>);
  }

  return <div className={`prose-academic ${className}`}>{blocks}</div>;
}
