# Data Ingestion & Export Overview

## What Gets Ingested Into Clarity OS

### 1. Project Data
**Tables:** `projects`
- Project name, description, status
- Client company information
- Start date, due date (target_completion_date)
- Kickoff transcript
- Created/updated timestamps

### 2. Stakeholder Information
**Tables:** `stakeholders`
- Name, email, phone
- Role, department, seniority
- Experience years
- Status (pending, invited, responded, completed)
- Created/updated timestamps

### 3. Questions
**Tables:** `questions`, `question_collections`
- Question text
- Category, subcategory
- Target roles
- Priority level
- Question collections (reusable sets)
- Created/updated timestamps

### 4. Interview Sessions
**Tables:** `interview_sessions`
- Session token (secure access)
- Interview name and type
- Status (pending, in_progress, completed)
- Total questions assigned
- Answered questions count
- Completion percentage
- Password protection
- Access tracking (IP hashing for security)
- Expiration dates
- Created/updated/completed timestamps

### 5. Interview Responses ⭐ PRIMARY CONTENT
**Tables:** `interview_responses`
**This is the MOST IMPORTANT data - stakeholder answers**

Each response includes:
- **Response type:** text, audio, video, or file
- **Response text:** Written answers
- **File URL:** Location of audio/video/document
- **File name and size**
- **Duration:** For audio/video recordings
- **Transcription:** AI-generated text from audio/video
- **AI summary:** Optional summarization
- **Created/updated timestamps**

**What gets captured:**
- Text answers typed by stakeholders
- Audio recordings with automatic transcription
- Video recordings with automatic transcription
- File uploads (documents, images, etc.)
- Multiple responses per question (follow-ups)

### 6. Question Assignments
**Tables:** `question_assignments`
- Links questions to stakeholders and interview sessions
- Order index (question sequence)
- Required/optional flags
- Completion tracking
- Created timestamps

### 7. Document Uploads
**Tables:** `project_uploads`
- File name, type, size
- Upload type (kickoff_material, reference, response, etc.)
- Description
- Include in generation flag (for AI context)
- Uploaded by user
- Created timestamps

### 8. Generated Documents
**Tables:** `documents`, `document_runs`, `document_run_files`
- Document templates used
- Generated document content
- Multiple output formats (DOCX, PDF, MD, CSV, JSON)
- Version history
- Generation status and progress
- File URLs and sizes
- Created/updated timestamps

### 9. Document Templates
**Tables:** `document_templates`
- Template name and content
- Supported output formats
- System vs. custom templates
- AI prompts for generation
- Created/updated timestamps

### 10. Project Vectors (AI Embeddings)
**Tables:** `project_vectors`
- Text chunks from all project content
- Vector embeddings for semantic search
- Source type (interview, document, upload, etc.)
- Metadata for context
- Created timestamps

**Sources for vector embeddings:**
- Interview responses (text + transcriptions)
- Project descriptions
- Kickoff transcripts
- Uploaded documents
- Generated documents
- Stakeholder information

### 11. Project Exports
**Tables:** `project_exports`
- Export type (full_backup, human_readable, dual)
- File size and format
- Manifest (contents summary)
- Created timestamps
- Exported by user

### 12. Relationships & Assignments
**Tables:** `project_assignments`
- User assignments to projects
- Role-based access control
- Created timestamps

---

## Current Export Formats

### Full Backup Export (JSON)
**File:** `backup.json`

Contains complete database dump:
- All project data
- All stakeholders
- All questions
- All interview sessions
- All interview responses
- All uploads
- All document runs and generated files
- All question assignments
- All project assignments
- All project vectors
- All documents
- Relationship mappings

**Purpose:** Perfect restore capability - can re-import and recreate entire project

### Human-Readable Export (CSV/MD)
**Files:**
1. `README.md` - Export overview and instructions
2. `stakeholders.csv` - Stakeholder contact list
3. `responses.md` - Interview responses in markdown format

**Current Issue:** responses.md is BASIC and needs improvement
- Currently only shows response text and date
- Missing stakeholder names
- Missing question text
- Missing transcriptions
- No organization by stakeholder or interview
- No metadata (duration, file types, etc.)

---

## What Gets Searched by Sidekick AI

When you ask questions in the Sidekick, it searches:

1. **Direct Database Queries** (for specific entity requests):
   - Stakeholder information
   - Project overview and timeline
   - Interview sessions and completion status
   - Documents and uploads
   - Exports history
   - Client/company project history

2. **Vector Semantic Search** (for content-heavy queries):
   - Interview response text
   - Audio/video transcriptions
   - Question text
   - Project descriptions
   - Kickoff transcripts
   - Document content
   - Upload metadata

3. **Timestamp Queries** (for temporal questions):
   - When stakeholders were added
   - When interviews were completed
   - When responses were submitted (first/last)
   - When files were uploaded
   - When documents were created/updated
   - When exports were generated
   - Project creation/due dates

---

## Data Flow

### Interview Response Submission Flow:
1. Stakeholder accesses secure interview link
2. Answers questions via text, audio, video, or file upload
3. Audio/video automatically transcribed using OpenAI Whisper
4. Response saved to `interview_responses` table
5. Interview session progress updated automatically
6. Stakeholder status updated (pending → responded → completed)
7. Response content chunked and embedded into `project_vectors`
8. Content becomes searchable via Sidekick AI

### Export Generation Flow:
1. User clicks "Export Project"
2. System fetches ALL related data from database
3. Generates manifest with counts and metadata
4. Creates backup.json with complete data
5. Creates human-readable files (CSV, MD)
6. Saves export record to database
7. Downloads files to user's computer

---

## Recommendations for Improvement

### High Priority:
1. **Enhanced responses export** - Include full interview context
2. **Better response organization** - Group by stakeholder and interview
3. **Include transcriptions** - Show AI-generated text from audio/video
4. **Add question text** - Show what was being answered
5. **Include metadata** - File types, durations, timestamps

### Medium Priority:
1. **Export to ZIP** - Bundle multiple files instead of separate downloads
2. **Client export** - Export all projects for a specific client
3. **Template exports** - Export question collections and document templates
4. **Analytics export** - Include usage statistics and metrics

### Low Priority:
1. **PDF exports** - Generate polished PDF reports
2. **Excel exports** - Full data exports in spreadsheet format
3. **Import functionality** - Re-import backup.json to restore projects
