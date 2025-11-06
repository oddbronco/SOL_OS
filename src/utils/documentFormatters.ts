export interface DocumentStructure {
  title: string;
  metadata?: {
    project?: string;
    client?: string;
    date?: string;
    version?: string;
    author?: string;
    status?: string;
    [key: string]: any;
  };
  summary?: string;
  sections: DocumentSection[];
  appendix?: DocumentAppendix[];
  references?: string[];
}

export interface DocumentSection {
  heading: string;
  summary?: string;
  content?: string;
  items?: DocumentItem[];
  subsections?: DocumentSubsection[];
  table?: DocumentTable;
  callout?: {
    type: 'info' | 'warning' | 'tip' | 'note';
    content: string;
  };
}

export interface DocumentItem {
  title?: string;
  description?: string;
  content?: string;
  details?: string[];
  value?: string;
  priority?: string;
  status?: string;
  tags?: string[];
}

export interface DocumentSubsection {
  title: string;
  content?: string;
  items?: string[] | DocumentItem[];
  table?: DocumentTable;
}

export interface DocumentTable {
  headers: string[];
  rows: string[][];
}

export interface DocumentAppendix {
  title: string;
  content: string;
}

export const formatToMarkdown = (data: DocumentStructure): string => {
  let md = `# ${data.title}\n\n`;

  if (data.metadata) {
    md += '---\n';
    Object.entries(data.metadata).forEach(([key, value]) => {
      md += `${key}: ${value}\n`;
    });
    md += '---\n\n';
  }

  if (data.summary) {
    md += `## Executive Summary\n\n${data.summary}\n\n`;
  }

  data.sections.forEach((section) => {
    md += `## ${section.heading}\n\n`;

    if (section.summary) {
      md += `${section.summary}\n\n`;
    }

    if (section.callout) {
      const emoji = section.callout.type === 'warning' ? '⚠️'
        : section.callout.type === 'tip' ? '💡'
        : section.callout.type === 'note' ? '📝'
        : 'ℹ️';
      md += `> ${emoji} **${section.callout.type.toUpperCase()}**: ${section.callout.content}\n\n`;
    }

    if (section.content) {
      md += `${section.content}\n\n`;
    }

    if (section.table) {
      md += `| ${section.table.headers.join(' | ')} |\n`;
      md += `| ${section.table.headers.map(() => '---').join(' | ')} |\n`;
      section.table.rows.forEach(row => {
        md += `| ${row.join(' | ')} |\n`;
      });
      md += '\n';
    }

    if (section.items && Array.isArray(section.items)) {
      section.items.forEach((item) => {
        if (typeof item === 'string') {
          md += `- ${item}\n`;
        } else if (item.title) {
          md += `### ${item.title}`;
          if (item.priority) md += ` \`[${item.priority}]\``;
          if (item.status) md += ` \`${item.status}\``;
          md += '\n\n';
          if (item.description) md += `${item.description}\n\n`;
          if (item.content) md += `${item.content}\n\n`;
          if (item.tags && item.tags.length > 0) {
            md += `**Tags:** ${item.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
          }
          if (item.details && Array.isArray(item.details)) {
            item.details.forEach((detail) => md += `- ${detail}\n`);
            md += '\n';
          }
        }
      });
    }

    if (section.subsections && Array.isArray(section.subsections)) {
      section.subsections.forEach((sub) => {
        md += `### ${sub.title}\n\n`;
        if (sub.content) md += `${sub.content}\n\n`;
        if (sub.table) {
          md += `| ${sub.table.headers.join(' | ')} |\n`;
          md += `| ${sub.table.headers.map(() => '---').join(' | ')} |\n`;
          sub.table.rows.forEach(row => {
            md += `| ${row.join(' | ')} |\n`;
          });
          md += '\n';
        }
        if (sub.items && Array.isArray(sub.items)) {
          sub.items.forEach((item) => {
            const itemText = typeof item === 'string'
              ? item
              : item.title || item.description || item.content || '';
            if (itemText) md += `- ${itemText}\n`;
          });
          md += '\n';
        }
      });
    }
  });

  if (data.appendix && data.appendix.length > 0) {
    md += '\n---\n\n## Appendix\n\n';
    data.appendix.forEach((app, idx) => {
      md += `### Appendix ${String.fromCharCode(65 + idx)}: ${app.title}\n\n`;
      md += `${app.content}\n\n`;
    });
  }

  if (data.references && data.references.length > 0) {
    md += '\n## References\n\n';
    data.references.forEach((ref, idx) => {
      md += `${idx + 1}. ${ref}\n`;
    });
    md += '\n';
  }

  return md;
};

export const formatToPlainText = (data: DocumentStructure): string => {
  let txt = `${data.title.toUpperCase()}\n`;
  txt += '='.repeat(data.title.length) + '\n\n';

  if (data.metadata) {
    Object.entries(data.metadata).forEach(([key, value]) => {
      txt += `${key.toUpperCase()}: ${value}\n`;
    });
    txt += '\n' + '-'.repeat(60) + '\n\n';
  }

  if (data.summary) {
    txt += `EXECUTIVE SUMMARY\n\n${data.summary}\n\n`;
    txt += '-'.repeat(60) + '\n\n';
  }

  data.sections.forEach((section) => {
    txt += `\n${section.heading.toUpperCase()}\n`;
    txt += '-'.repeat(section.heading.length) + '\n\n';

    if (section.summary) txt += `${section.summary}\n\n`;
    if (section.content) txt += `${section.content}\n\n`;

    if (section.items && Array.isArray(section.items)) {
      section.items.forEach((item) => {
        if (typeof item === 'string') {
          txt += `• ${item}\n`;
        } else if (item.title) {
          txt += `\n  ${item.title}\n`;
          if (item.description) txt += `  ${item.description}\n`;
          if (item.content) txt += `  ${item.content}\n`;
          if (item.details) {
            item.details.forEach((d) => txt += `    - ${d}\n`);
          }
          txt += '\n';
        }
      });
    }

    if (section.subsections && Array.isArray(section.subsections)) {
      section.subsections.forEach((sub) => {
        txt += `\n  ${sub.title.toUpperCase()}\n`;
        if (sub.content) txt += `  ${sub.content}\n\n`;
        if (sub.items) {
          sub.items.forEach((item) => {
            const itemText = typeof item === 'string'
              ? item
              : item.title || item.description || item.content || '';
            if (itemText) txt += `    • ${itemText}\n`;
          });
          txt += '\n';
        }
      });
    }
  });

  return txt;
};

export const formatToDocx = (data: DocumentStructure): string => {
  let doc = `${data.title}\n`;
  doc += '═'.repeat(80) + '\n\n';

  if (data.metadata) {
    Object.entries(data.metadata).forEach(([key, value]) => {
      doc += `${key}: ${value}\n`;
    });
    doc += '\n' + '─'.repeat(80) + '\n\n';
  }

  if (data.summary) {
    doc += `EXECUTIVE SUMMARY\n\n${data.summary}\n\n`;
    doc += '─'.repeat(80) + '\n\n';
  }

  data.sections.forEach((section, idx) => {
    doc += `${idx + 1}. ${section.heading}\n\n`;

    if (section.summary) doc += `   ${section.summary}\n\n`;
    if (section.content) doc += `   ${section.content}\n\n`;

    if (section.items && Array.isArray(section.items)) {
      section.items.forEach((item, itemIdx) => {
        if (typeof item === 'string') {
          doc += `   ${idx + 1}.${itemIdx + 1} ${item}\n`;
        } else if (item.title) {
          doc += `   ${idx + 1}.${itemIdx + 1} ${item.title}\n`;
          if (item.description) doc += `       ${item.description}\n`;
          if (item.content) doc += `       ${item.content}\n`;
          if (item.details) {
            item.details.forEach((d) => doc += `       • ${d}\n`);
          }
          doc += '\n';
        }
      });
    }

    if (section.subsections) {
      section.subsections.forEach((sub, subIdx) => {
        doc += `   ${idx + 1}.${subIdx + 1} ${sub.title}\n`;
        if (sub.content) doc += `       ${sub.content}\n`;
        if (sub.items) {
          sub.items.forEach((item) => {
            const itemText = typeof item === 'string'
              ? item
              : item.title || item.description || item.content || '';
            if (itemText) doc += `       • ${itemText}\n`;
          });
        }
        doc += '\n';
      });
    }

    doc += '─'.repeat(80) + '\n\n';
  });

  return doc;
};

export const formatToPdf = (data: DocumentStructure): string => {
  return formatToDocx(data);
};

export const formatToJson = (data: DocumentStructure): string => {
  return JSON.stringify(data, null, 2);
};

export const formatToCsv = (data: DocumentStructure): string => {
  const rows: string[][] = [['Section', 'Heading', 'Content', 'Type', 'Priority', 'Status', 'Tags']];

  data.sections.forEach((section) => {
    rows.push([
      section.heading,
      section.heading,
      section.summary || section.content || '',
      'section',
      '',
      '',
      ''
    ]);

    if (section.table) {
      section.table.rows.forEach((row) => {
        rows.push([
          section.heading,
          section.table!.headers.join(' | '),
          row.join(' | '),
          'table_row',
          '',
          '',
          ''
        ]);
      });
    }

    if (section.items) {
      section.items.forEach((item) => {
        if (typeof item === 'string') {
          rows.push([section.heading, '', item, 'item', '', '', '']);
        } else {
          rows.push([
            section.heading,
            item.title || '',
            item.description || item.content || '',
            'item',
            item.priority || '',
            item.status || '',
            item.tags?.join('; ') || ''
          ]);
          if (item.details) {
            item.details.forEach((detail) => {
              rows.push([section.heading, item.title || '', detail, 'detail', '', '', '']);
            });
          }
        }
      });
    }

    if (section.subsections) {
      section.subsections.forEach((sub) => {
        rows.push([
          section.heading,
          sub.title,
          sub.content || '',
          'subsection',
          '',
          '',
          ''
        ]);
        if (sub.table) {
          sub.table.rows.forEach((row) => {
            rows.push([
              section.heading,
              sub.title + ' | ' + sub.table!.headers.join(' | '),
              row.join(' | '),
              'table_row',
              '',
              '',
              ''
            ]);
          });
        }
        if (sub.items) {
          sub.items.forEach((item) => {
            const itemText = typeof item === 'string'
              ? item
              : item.title || item.description || item.content || '';
            const priority = typeof item === 'string' ? '' : item.priority || '';
            const status = typeof item === 'string' ? '' : item.status || '';
            const tags = typeof item === 'string' ? '' : item.tags?.join('; ') || '';
            rows.push([section.heading, sub.title, itemText, 'subitem', priority, status, tags]);
          });
        }
      });
    }
  });

  if (data.appendix) {
    data.appendix.forEach((app) => {
      rows.push(['Appendix', app.title, app.content, 'appendix', '', '', '']);
    });
  }

  return rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

export const formatDocument = (data: DocumentStructure, format: string): string => {
  switch (format.toLowerCase()) {
    case 'markdown':
    case 'md':
      return formatToMarkdown(data);
    case 'txt':
    case 'text':
      return formatToPlainText(data);
    case 'docx':
      return formatToDocx(data);
    case 'pdf':
      return formatToPdf(data);
    case 'json':
      return formatToJson(data);
    case 'csv':
      return formatToCsv(data);
    default:
      return formatToMarkdown(data);
  }
};

export const parseStructuredResponse = (response: string): DocumentStructure | null => {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse structured response:', e);
    return null;
  }
};
