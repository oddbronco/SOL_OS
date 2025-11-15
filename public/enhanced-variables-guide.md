# Enhanced Document Variables - With Full Content Extraction

## 🎉 Major Enhancement: Full File Content in `{{uploads}}`

The `{{uploads}}` variable has been dramatically enhanced to include **complete extracted content** from all uploaded files!

### What's New?

- **Text Files**: Full content extracted and included
- **Video Files**: Auto-transcribed with timestamps (OpenAI Whisper)
- **Audio Files**: Auto-transcribed with timestamps
- **Structured Data** (CSV/JSON): Parsed and formatted for AI

### Before vs After

**OLD WAY (Just File List):**
```
1. requirements.txt (45 KB)
2. meeting.mp4 (125 MB)
3. data.csv (12 KB)
```

**NEW WAY (Full Content + Transcripts):**
```
1. requirements.txt
   === FILE CONTENT ===
   Project Requirements v1.0
   1. Must support mobile devices
   2. Integration with existing auth
   (FULL TEXT OF FILE)
   === END ===

2. meeting.mp4 (Video Transcript - 3,245 words)
   === TRANSCRIPT ===
   [00:00] Welcome to the kickoff meeting
   [00:15] Today we'll discuss requirements
   [00:45] John: Our primary goal is...
   (COMPLETE TIMESTAMPED TRANSCRIPT)
   === END ===

3. data.csv (Structured Data - 150 rows)
   === CONTENT ===
   | User ID | Department | Priority |
   | 1001 | Engineering | High |
   | 1002 | Sales | Medium |
   (COMPLETE PARSED CSV)
   === END ===
```

## 🚀 Quick Start

### 1. Upload Files to Your Project
Go to Files tab → Upload any files (text, video, audio, CSV, JSON)

### 2. Extract Content
Click "Extract" button → System processes file automatically:
- Text files → Reads full content
- Videos/Audio → Transcribes with Whisper AI
- CSV/JSON → Parses structure

### 3. Use in Templates
Simply use `{{uploads}}` in your document templates:

```markdown
# Requirements Document

## All Sources
{{uploads}}

## Analysis
Based on all uploaded content above, create a comprehensive analysis...
```

## 📊 Intelligent Context Chunking

### The Problem
AI has token limits (~120K tokens). Large projects with many files/transcripts can exceed this.

### The Solution
Automatic intelligent chunking:

1. **Estimates total content size**
2. **Prioritizes critical information**:
   - Project summary (highest priority)
   - Template prompt
   - Interview responses
   - Stakeholder profiles
   - File content
   - Questions
   - Metadata (lowest priority)

3. **Handles overflow** with two strategies:

#### Sequential Chunking (Medium Context)
```
Pass 1: Process high-priority content
Pass 2: Process remaining content
Pass 3: Combine results
```

#### Hierarchical Chunking (Large Context)
```
Phase 1: Process critical content → Generate summary
Phase 2: Add details using summary as base
Phase 3: Refine with remaining content
Final: Combine all iterations
```

## 🎯 Supported File Types

| Extension | Type | Extraction | Status |
|-----------|------|------------|--------|
| .txt | Text | Direct | ✅ Active |
| .md | Markdown | Direct | ✅ Active |
| .csv | Structured | Parsed table | ✅ Active |
| .json | Structured | Parsed JSON | ✅ Active |
| .mp4 | Video | Whisper transcript | ✅ Active |
| .mov | Video | Whisper transcript | ✅ Active |
| .webm | Video | Whisper transcript | ✅ Active |
| .mp3 | Audio | Whisper transcript | ✅ Active |
| .wav | Audio | Whisper transcript | ✅ Active |
| .m4a | Audio | Whisper transcript | ✅ Active |
| .pdf | Document | Text extraction | 🔜 Coming |
| .docx | Document | Text extraction | 🔜 Coming |
| .jpg/.png | Image | OCR | 🔜 Coming |

## 💡 Power User Examples

### Example 1: Meeting Transcript Analysis
```markdown
# Meeting Summary for {{project_name}}

## Complete Transcript
{{uploads}}

## Key Decisions
Based on the meeting transcript above, list all decisions made:

## Action Items
Extract all action items mentioned in the transcript:

## Participants
List all participants who spoke and summarize their main points:
```

### Example 2: Multi-Source Requirements
```markdown
# Complete Requirements Analysis

## Interview Responses
{{question_answers}}

## Supporting Documents & Transcripts
{{uploads}}

## Unified Requirements
Synthesize the interview responses and all uploaded content into a single prioritized requirements list:
```

### Example 3: CSV Data Analysis
```markdown
# Data Analysis Report

## Raw Data
{{uploads}}

## Statistical Analysis
Analyze the CSV data above and provide:
1. Summary statistics
2. Key trends
3. Anomalies or outliers
4. Recommendations based on the data
```

### Example 4: Complete Project Context
```markdown
# {{project_name}} - Complete Context

## Project Overview
{{project_summary}}

## Team
{{stakeholders}}

## Interview Insights
{{responses_by_category}}

## All Supporting Content
{{uploads}}

## AI Synthesis
Given ALL the context above from multiple sources:
1. What are the 5 most critical requirements?
2. Are there any contradictions or conflicts?
3. What's missing or unclear?
4. What are the biggest risks?
```

## ⚠️ Important Notes

### Extraction Status
Files must be extracted before content appears:
- **Pending**: Click "Extract" to process
- **Processing**: Extraction in progress
- **Completed**: Content available in `{{uploads}}`
- **Failed**: Check error and retry
- **Not Applicable**: Binary files (images without OCR)

### Token Management
System automatically manages large context:
- Small projects: Single AI call
- Medium projects: 2-3 chunked calls
- Large projects: Hierarchical processing

You'll see logs like:
```
📊 Context Analysis:
  - Total chunks: 7
  - Estimated tokens: 145,230
  - Needs chunking: true
  - Strategy: hierarchical

  - project_summary: ~450 tokens (priority: 0)
  - template_prompt: ~1,200 tokens (priority: 1)
  - question_answers: ~35,600 tokens (priority: 2)
  - stakeholder_profiles: ~800 tokens (priority: 3)
  - file_content: ~105,400 tokens (priority: 4)
  - questions_list: ~900 tokens (priority: 5)
  - metadata: ~80 tokens (priority: 6)

🌳 Using hierarchical chunking for large context
  🎯 Phase 1: Processing 3 critical chunks
  📝 Phase 1 summary: ~2,100 tokens
  📦 Phase 2.1: Processing detail batch
  📦 Phase 2.2: Processing final detail batch
✅ Completed hierarchical processing, combining results
```

### Best Practices

1. **Extract Before Generating**: Always run extraction before document generation
2. **Multiple Formats**: Upload both videos AND written docs for completeness
3. **Descriptive Filenames**: Use clear filenames for better context
4. **CSV Headers**: Ensure CSVs have clear column headers
5. **Video Quality**: Clear audio improves transcription accuracy

## 🔧 Technical Details

### Transcription
- Uses OpenAI Whisper API
- Supports 50+ languages (configurable, default: English)
- Includes timestamps for every segment
- Verbose JSON format for maximum detail

### Storage
- Extracted content stored in `project_uploads.extracted_content`
- Word count auto-calculated
- Full-text search enabled
- Content indexed for fast retrieval

### Error Handling
- Automatic retry on transient failures
- Clear error messages in UI
- Failed extractions don't block generation
- Files without extraction fall back to metadata only
